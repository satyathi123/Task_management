import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft, ChevronRight, FileSpreadsheet, Edit3 } from 'lucide-react';
import {
  testService,
  questionService,
  subjectService,
  topicService,
  subTopicService,
  Test,
  Question,
  Topic,
  SubTopic,
} from '../services/api';
import Loader from '../components/Loader';
import { confirmDelete, confirmClear, confirmReplace, showWarning, showSuccess } from '../utils/swal';
import { parseQuestionsCSV, generateCSVTemplate } from '../utils/csvParser';
import '../styles/components.css';

/** Internal flag: CSV rows are preview until the user edits that question. */
type LocalQuestion = Question & { fromCsv?: boolean };

const toApiQuestion = (q: LocalQuestion): Question => {
  const { fromCsv: _, ...apiQuestion } = q;
  return apiQuestion;
};

const AddQuestions: React.FC = () => {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Test configuration
  const [test, setTest] = useState<Test | null>(null);
  const [resolvedSubjectId, setResolvedSubjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cascading lists filtered by test metadata
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);

  // Questions Local State
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [importingCSV, setImportingCSV] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadTestAndQuestions = async () => {
      if (!testId) return;
      try {
        setLoading(true);
        const testData = await testService.getTestById(testId);
        setTest(testData);

        // Fetch subjects/topics to populate dropdowns
        let resolvedSubId = '';
        if (testData.subject) {
          const subList = await subjectService.getSubjects();
          const matchingSub = subList.find(
            (s) => s.id === testData.subject || s.name.toLowerCase() === testData.subject.toLowerCase()
          );
          resolvedSubId = matchingSub ? matchingSub.id : testData.subject;
          setResolvedSubjectId(resolvedSubId);

          const topicList = await topicService.getTopicsBySubject(resolvedSubId);
          // Filter topics by those configured in the test (checks both ID and Name)
          const filteredTopics = topicList.filter(
            (t) =>
              testData.topics &&
              (testData.topics.includes(t.id) ||
                testData.topics.some((topicName) => topicName.toLowerCase() === t.name.toLowerCase()))
          );
          setTopics(filteredTopics);

          if (filteredTopics.length > 0) {
            const subList = await subTopicService.getSubTopicsMultiTopics(
              filteredTopics.map((t) => t.id)
            );
            const filteredSubs = subList.filter(
              (s) =>
                testData.sub_topics &&
                (testData.sub_topics.includes(s.id) ||
                  testData.sub_topics.some((subName) => subName.toLowerCase() === s.name.toLowerCase()))
            );
            setSubTopics(filteredSubs);
          }
        }

        // Initialize questions
        let loadedQuestions: Question[] = [];
        if (testData.questions && testData.questions.length > 0) {
          try {
            const fetched = await questionService.fetchBulkQuestions(testData.questions);
            loadedQuestions = fetched || [];
          } catch (qErr) {
            console.error('Failed to fetch questions bulk, initializing empty', qErr);
          }
        }

        const size = Math.max(testData.total_questions || 1, loadedQuestions.length);
        const finalQuestions: LocalQuestion[] = Array.from({ length: size }, (_, idx) => {
          if (loadedQuestions[idx]) {
            return {
              ...loadedQuestions[idx],
              subject: loadedQuestions[idx].subject || resolvedSubId,
              topic: loadedQuestions[idx].topic || '',
              sub_topic: loadedQuestions[idx].sub_topic || '',
              paragraph: loadedQuestions[idx].paragraph || '',
              media_url: loadedQuestions[idx].media_url || '',
              category: loadedQuestions[idx].category || '',
            };
          }
          return {
            type: 'mcq',
            subject: resolvedSubId,
            question: '',
            option1: '',
            option2: '',
            option3: '',
            option4: '',
            correct_option: 'option1',
            explanation: '',
            difficulty: testData.difficulty || 'easy',
            topic: '',
            sub_topic: '',
            paragraph: '',
            media_url: '',
            category: '',
            test_id: testId,
          };
        });

        setQuestions(finalQuestions);
        setError(null);
      } catch (err: any) {
        setError('Failed to load test details.');
      } finally {
        setLoading(false);
      }
    };

    loadTestAndQuestions();
  }, [testId]);

  const activeQuestion = questions[activeIndex];

  const updateActiveQuestion = (fields: Partial<Question>) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[activeIndex] = { ...updated[activeIndex], ...fields, fromCsv: false };
      return updated;
    });
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      type: 'mcq',
      subject: resolvedSubjectId,
      question: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_option: 'option1',
      explanation: '',
      difficulty: test?.difficulty || 'easy',
      topic: '',
      sub_topic: '',
      paragraph: '',
      media_url: '',
      category: '',
      test_id: testId,
    };
    setQuestions((prev) => [...prev, newQ]);
    setActiveIndex(questions.length);
  };

  const handleDeleteActiveQuestion = async () => {
    if (questions.length <= 1) {
      showWarning('Cannot Delete', 'A test must contain at least one question.');
      return;
    }
    const confirmed = await confirmDelete('this question');
    if (confirmed) {
      const updated = questions.filter((_, idx) => idx !== activeIndex);
      setQuestions(updated);
      setActiveIndex(Math.max(0, activeIndex - 1));
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = await confirmClear();
    if (confirmed) {
      const resetQs = questions.map((q) => ({
        ...q,
        question: '',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        correct_option: 'option1',
        explanation: '',
      }));
      setQuestions(resetQs.map((q) => ({ ...q, fromCsv: false })));
      setActiveIndex(0);
    }
  };

  const isQuestionComplete = (q: LocalQuestion) => {
    return (
      q.question.trim() !== '' &&
      q.option1.trim() !== '' &&
      q.option2.trim() !== '' &&
      q.option3.trim() !== '' &&
      q.option4.trim() !== ''
    );
  };

  /** CSV-imported rows count as complete only after the user edits them. */
  const isQuestionSavable = (q: LocalQuestion) => isQuestionComplete(q) && !q.fromCsv;

  const handleSaveAndContinue = async () => {
    // Validation — same as manual: only fully filled questions, excluding unedited CSV rows
    const filledQuestions = questions.filter(isQuestionSavable);
    if (filledQuestions.length === 0) {
      const hasUneditedCsv = questions.some((q) => q.fromCsv && isQuestionComplete(q));
      showWarning(
        'Incomplete Questions',
        hasUneditedCsv
          ? 'CSV questions are loaded. Please edit each question you want to save (change any field), then click Save & Continue.'
          : 'Please fill out at least one question fully (question text + all 4 options) before continuing.'
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Bulk Create/Update Questions
      const questionsToSave = filledQuestions.map((q) => {
        const apiQ = toApiQuestion(q);
        return {
          ...apiQ,
          subject: apiQ.subject || resolvedSubjectId,
          topic: apiQ.topic || '',
          sub_topic: apiQ.sub_topic || '',
          paragraph: apiQ.paragraph || '',
          media_url: apiQ.media_url || '',
          category: apiQ.category || '',
        };
      });

      const existingQuestions = questionsToSave.filter((q) => !!q.id);
      const newQuestions = questionsToSave.filter((q) => !q.id);

      let savedNewQuestions: Question[] = [];
      if (newQuestions.length > 0) {
        const createResponse = await questionService.bulkCreateQuestions(newQuestions);
        if ((createResponse.success || createResponse.status === 'success') && createResponse.data) {
          savedNewQuestions = createResponse.data;
        } else {
          throw new Error(createResponse.message || 'Failed to create new questions');
        }
      }

      if (existingQuestions.length > 0) {
        const updateResponse = await questionService.bulkUpdateQuestions(existingQuestions);
        if (!(updateResponse.success || updateResponse.status === 'success')) {
          throw new Error(updateResponse.message || 'Failed to update existing questions');
        }
      }

      // Combine saved IDs preserving the original order of questions
      let newIdx = 0;
      const savedIds = questionsToSave.map((q) => {
        if (q.id) {
          return q.id;
        } else {
          const newQ = savedNewQuestions[newIdx++];
          return newQ?.id;
        }
      }).filter((id): id is string => !!id);

        // 2. Link saved questions with test configuration
        await testService.updateTest(testId!, {
          questions: savedIds,
          total_questions: filledQuestions.length,
          total_marks: filledQuestions.length * (test?.correct_marks || 5),
        });

        // 3. Navigate to preview & publish
        navigate(`/test/preview/${testId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred while saving questions.');
    } finally {
      setSaving(false);
    }
  };

  const hasExistingContent = () =>
    questions.some(
      (q) =>
        q.question.trim() !== '' ||
        q.option1.trim() !== '' ||
        q.option2.trim() !== '' ||
        q.option3.trim() !== '' ||
        q.option4.trim() !== '' ||
        (q.explanation?.trim() ?? '') !== ''
    );

  const handleCSVUpload = () => {
    csvInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([generateCSVTemplate()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'questions_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !testId) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showWarning('Invalid File', 'Please upload a .csv file.');
      return;
    }

    if (hasExistingContent()) {
      const confirmed = await confirmReplace(
        'Replace existing questions?',
        'Importing a CSV will replace all current questions with the rows from your file. Continue?'
      );
      if (!confirmed) return;
    }

    setImportingCSV(true);
    setError(null);

    try {
      const text = await file.text();
      const { questions: imported, skippedRows } = parseQuestionsCSV(text, {
        subject: resolvedSubjectId,
        testId,
        defaultDifficulty: test?.difficulty || 'easy',
      });

      const minSize = Math.max(test?.total_questions || 1, imported.length);
      const paddedQuestions: LocalQuestion[] = Array.from({ length: minSize }, (_, idx) => {
        if (imported[idx]) return { ...imported[idx], fromCsv: true };
        return {
          type: 'mcq',
          subject: resolvedSubjectId,
          question: '',
          option1: '',
          option2: '',
          option3: '',
          option4: '',
          correct_option: 'option1',
          explanation: '',
          difficulty: test?.difficulty || 'easy',
          topic: '',
          sub_topic: '',
          paragraph: '',
          media_url: '',
          category: '',
          test_id: testId,
        };
      });

      setQuestions(paddedQuestions);
      setActiveIndex(0);

      const skippedMsg =
        skippedRows.length > 0
          ? ` ${skippedRows.length} row(s) were skipped due to validation errors.`
          : '';
      showSuccess(
        'CSV Imported',
        `Loaded ${imported.length} question(s). Edit each question you want to save.${skippedMsg}`
      );
    } catch (err: any) {
      showWarning('CSV Import Failed', err.message || 'Could not parse the CSV file.');
    } finally {
      setImportingCSV(false);
    }
  };

  if (loading) return <Loader />;
  if (!test || !activeQuestion) return <div className="card text-center">Test not found.</div>;

  return (
    <div className="flex fade-in" style={{ height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleCSVFileChange}
      />
      {/* Left Sidebar Checklist */}
      <div
        className="flex flex-column"
        style={{
          width: '260px',
          borderRight: '1px solid var(--border-color)',
          backgroundColor: 'white',
          height: '100%',
        }}
      >
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Question creation</h2>
          <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Total Questions</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{questions.length}</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="flex flex-column gap-2">
          {questions.map((q, idx) => {
            const isDone = isQuestionSavable(q);
            const isActive = idx === activeIndex;

            return (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className="flex items-center justify-between"
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  textAlign: 'left',
                  color: isActive ? 'var(--primary-color)' : 'var(--text-primary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isDone ? 'var(--success-color)' : 'var(--text-muted)',
                    }}
                  ></span>
                  <span>Question {idx + 1}</span>
                </div>
                {isDone && (
                  <span
                    style={{
                      color: 'var(--success-color)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={handleAddQuestion}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem' }}
          >
            <Plus size={14} /> Add Another Question
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-color)', height: '100%' }}>
        <div className="content-container" style={{ padding: '1.5rem', maxWidth: '900px' }}>
          {error && (
            <div
              className="badge badge-danger"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                borderRadius: 'var(--radius-md)',
                justifyContent: 'flex-start',
                textAlign: 'left',
              }}
            >
              {error}
            </div>
          )}
          {/* Top Test configuration banner */}
          <div className="card flex justify-between items-center" style={{ padding: '1rem', borderLeft: '4px solid var(--success-color)' }}>
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: '0.25rem' }}>
                <span className="badge badge-primary">{test.type?.replace('_', ' ')}</span>
                <span className="badge badge-success">Draft</span>
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{test.name}</h2>
              <div className="flex gap-4" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                <span>Subject: <strong>{test.subject}</strong></span>
                <span>Time: <strong>{test.total_time} Min</strong></span>
                <span>Marks: <strong>{test.total_marks} Pts</strong></span>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate(`/test/edit/${testId}`)}>
              <Edit3 size={14} /> Edit Config
            </button>
          </div>

          {/* Question Form */}
          <div className="card flex flex-column gap-6" style={{ marginTop: '1rem' }}>
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'Outfit' }}>
                Question {activeIndex + 1}
              </h3>
              <div className="btn-group">
                <button
                  type="button"
                  onClick={handleCSVUpload}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  disabled={importingCSV}
                  id="btn_csv_upload"
                >
                  <FileSpreadsheet size={14} /> {importingCSV ? 'Importing...' : '+ CSV'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  title="Download sample CSV template"
                >
                  Template
                </button>
                <button
                  type="button"
                  onClick={handleDeleteActiveQuestion}
                  className="btn btn-danger"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  <Trash2 size={14} /> Delete Question
                </button>
              </div>
            </div>

            <button
              onClick={handleDeleteAll}
              style={{
                color: 'var(--danger-dark)',
                fontSize: '0.85rem',
                fontWeight: 600,
                alignSelf: 'flex-start',
                cursor: 'pointer',
              }}
            >
              Delete All Edits
            </button>

            {/* Formatting Toolbar Mock */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Question Text</label>
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--border-light)',
                  display: 'flex',
                  gap: '0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  borderBottom: 'none',
                  flexWrap: 'wrap',
                }}
              >
                <strong>B</strong> <em>I</em> <u>U</u> <span style={{ cursor: 'pointer' }}>🔗</span>{' '}
                <span style={{ cursor: 'pointer' }}>🔢</span> <span style={{ cursor: 'pointer' }}>⚫</span>{' '}
                <span style={{ cursor: 'pointer' }}>🖼️</span> <span style={{ cursor: 'pointer' }}>💻</span>{' '}
                <span style={{ cursor: 'pointer' }}>✖️</span>
              </div>
              <textarea
                className="form-textarea"
                style={{ borderRadius: '0 0 var(--radius-md) var(--radius-md)', minHeight: '120px' }}
                placeholder="Type here..."
                value={activeQuestion.question}
                onChange={(e) => updateActiveQuestion({ question: e.target.value })}
              />
            </div>

            {/* Options Input */}
            <div className="flex flex-column gap-3">
              <label className="form-label" style={{ marginBottom: 0 }}>Type the options below</label>
              {[1, 2, 3, 4].map((optNum) => {
                const optKey = `option${optNum}` as keyof Question;
                const optVal = activeQuestion[optKey] as string;
                const optName = `option${optNum}`;
                const isCorrect = activeQuestion.correct_option === optName;

                return (
                  <div key={optNum} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct_option"
                      className="radio-input"
                      checked={isCorrect}
                      onChange={() => updateActiveQuestion({ correct_option: optName })}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Type Option ${optNum} here`}
                      value={optVal}
                      onChange={(e) => updateActiveQuestion({ [optKey]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>

            {/* Solution Explanation */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Add Solution (Explanation)</label>
              <textarea
                className="form-textarea"
                placeholder="Type here..."
                style={{ minHeight: '80px' }}
                value={activeQuestion.explanation}
                onChange={(e) => updateActiveQuestion({ explanation: e.target.value })}
              />
            </div>

            {/* Question settings */}
            <div className="form-row">
              {/* Difficulty Level */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Level of Difficulty</label>
                <select
                  className="form-select"
                  value={activeQuestion.difficulty}
                  onChange={(e) => updateActiveQuestion({ difficulty: e.target.value })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="difficult">Difficult</option>
                </select>
              </div>

              {/* Topic Select */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Topic</label>
                <select
                  className="form-select"
                  value={activeQuestion.topic}
                  onChange={(e) => updateActiveQuestion({ topic: e.target.value })}
                >
                  <option value="">Select Topic</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Topic Select */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Sub-topic</label>
                <select
                  className="form-select"
                  value={activeQuestion.sub_topic}
                  onChange={(e) => updateActiveQuestion({ sub_topic: e.target.value })}
                >
                  <option value="">Select Subtopic</option>
                  {subTopics.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Media URL (optional) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Media URL <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>(optional — image/video link)</span></label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com/image.png"
                value={activeQuestion.media_url || ''}
                onChange={(e) => updateActiveQuestion({ media_url: e.target.value })}
              />
            </div>

            {/* Navigation and Bottom actions */}
            <div className="flex justify-between items-center" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/dashboard')}
              >
                Exit Test Creation
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem' }}
                  onClick={() => setActiveIndex((p) => Math.max(0, p - 1))}
                  disabled={activeIndex === 0}
                >
                  <ChevronLeft size={20} />
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {activeIndex + 1} / {questions.length}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem' }}
                  onClick={() => setActiveIndex((p) => Math.min(questions.length - 1, p + 1))}
                  disabled={activeIndex === questions.length - 1}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAndContinue}
                disabled={saving}
                id="btn_save_questions"
              >
                {saving ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddQuestions;
