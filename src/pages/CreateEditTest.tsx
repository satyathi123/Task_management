import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  subjectService,
  topicService,
  subTopicService,
  testService,
  Subject,
  Topic,
  SubTopic,
} from '../services/api';
import Loader from '../components/Loader';
import '../styles/components.css';

const CreateEditTest: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const navigate = useNavigate();

  // API Lists
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);

  // Page States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [testType, setTestType] = useState('chapterwise'); // 'chapterwise', 'pyq', 'mock'
  const [name, setName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedSubTopicIds, setSelectedSubTopicIds] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(60);
  const [difficulty, setDifficulty] = useState('easy'); // 'easy', 'medium', 'difficult'

  // Marking Scheme
  const [wrongMarks, setWrongMarks] = useState<number>(-1);
  const [unattemptMarks, setUnattemptMarks] = useState<number>(0);
  const [correctMarks, setCorrectMarks] = useState<number>(5);
  const [noOfQuestions, setNoOfQuestions] = useState<number>(50);
  const [totalMarks, setTotalMarks] = useState<number>(250);

  // Auto-calculate Total Marks when correct marks or questions change
  useEffect(() => {
    setTotalMarks(noOfQuestions * correctMarks);
  }, [noOfQuestions, correctMarks]);

  // Load Subjects on mount
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const subList = await subjectService.getSubjects();
        setSubjects(subList || []);

        if (isEditMode) {
          // Load test data
          const testData = await testService.getTestById(id!);
          setName(testData.name);
          setTestType(testData.type);
          setDuration(testData.total_time);
          setDifficulty(testData.difficulty);
          setWrongMarks(testData.wrong_marks);
          setUnattemptMarks(testData.unattempt_marks);
          setCorrectMarks(testData.correct_marks);
          setNoOfQuestions(testData.total_questions);
          setTotalMarks(testData.total_marks);

          // Find the subject ID from name or UUID
          if (testData.subject) {
            // Check if subject list matches UUID or name
            const matchingSub = subList.find(
              (s) => s.id === testData.subject || s.name.toLowerCase() === testData.subject.toLowerCase()
            );
            if (matchingSub) {
              setSelectedSubjectId(matchingSub.id);
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        setError('Error initializing page. Check connection or authorization.');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [id, isEditMode]);

  // Load Topics when Subject changes
  useEffect(() => {
    const fetchTopics = async () => {
      if (!selectedSubjectId) {
        setTopics([]);
        setSelectedTopicIds([]);
        return;
      }
      try {
        const topicList = await topicService.getTopicsBySubject(selectedSubjectId);
        setTopics(topicList || []);

        // If editing and selectedSubjectId matches original, set topics
        if (isEditMode) {
          const testData = await testService.getTestById(id!);
          if (testData.topics && testData.topics.length > 0) {
            // Find intersection
            const validTopicIds = testData.topics
              .map((tNameOrId) => {
                const found = topicList.find(
                  (t) => t.id === tNameOrId || t.name.toLowerCase() === tNameOrId.toLowerCase()
                );
                return found ? found.id : null;
              })
              .filter((x): x is string => !!x);
            setSelectedTopicIds(validTopicIds);
          }
        }
      } catch (err) {
        console.error('Error fetching topics:', err);
      }
    };
    fetchTopics();
  }, [selectedSubjectId, isEditMode, id]);

  // Load Sub-topics when selected topics change
  useEffect(() => {
    const fetchSubTopics = async () => {
      if (selectedTopicIds.length === 0) {
        setSubTopics([]);
        setSelectedSubTopicIds([]);
        return;
      }
      try {
        const subList = await subTopicService.getSubTopicsMultiTopics(selectedTopicIds);
        setSubTopics(subList || []);

        if (isEditMode) {
          const testData = await testService.getTestById(id!);
          if (testData.sub_topics && testData.sub_topics.length > 0) {
            const validSubIds = testData.sub_topics
              .map((sNameOrId) => {
                const found = subList.find(
                  (s) => s.id === sNameOrId || s.name.toLowerCase() === sNameOrId.toLowerCase()
                );
                return found ? found.id : null;
              })
              .filter((x): x is string => !!x);
            setSelectedSubTopicIds(validSubIds);
          }
        }
      } catch (err) {
        console.error('Error fetching sub-topics:', err);
      }
    };
    fetchSubTopics();
  }, [selectedTopicIds, isEditMode, id]);

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((t) => t !== topicId) : [...prev, topicId]
    );
  };

  const handleSubTopicToggle = (subId: string) => {
    setSelectedSubTopicIds((prev) =>
      prev.includes(subId) ? prev.filter((s) => s !== subId) : [...prev, subId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a test name.');
      return;
    }
    if (!selectedSubjectId) {
      setError('Please select a subject.');
      return;
    }
    if (selectedTopicIds.length === 0) {
      setError('Please select at least one topic.');
      return;
    }
    if (selectedSubTopicIds.length === 0) {
      setError('Please select at least one sub-topic.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name,
      type: testType,
      subject: selectedSubjectId,
      topics: selectedTopicIds,
      sub_topics: selectedSubTopicIds,
      correct_marks: correctMarks,
      wrong_marks: wrongMarks,
      unattempt_marks: unattemptMarks,
      difficulty,
      total_time: duration,
      total_marks: totalMarks,
      total_questions: noOfQuestions,
      // Backend requires status to be a string — never send null
      status: 'draft' as const,
    };

    try {
      if (isEditMode) {
        await testService.updateTest(id!, payload);
        navigate(`/test/${id}/questions`);
      } else {
        const response = await testService.createTest(payload);
        // API may return { status: "success", data: {...} } or { success: true, data: {...} }
        const isSuccess = response.success === true || response.status === 'success';
        const data = Array.isArray(response.data) ? response.data[0] : response.data;
        if (isSuccess && data?.id) {
          navigate(`/test/${data.id}/questions`);
        } else {
          setError(response.message || 'Failed to create test. Please try again.');
        }
      }
    } catch (err: any) {
      console.error(err);
      const backendErrors = err.response?.data?.errors;
      const errMsg = Array.isArray(backendErrors)
        ? backendErrors.map((e: any) => e.msg).join(', ')
        : err.response?.data?.message || 'Failed to save test details. Please try again.';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="content-container fade-in">
      <div className="card">
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'Outfit, sans-serif',
            marginBottom: '2rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '1rem',
          }}
        >
          {isEditMode ? 'Edit Test details' : 'Create Test details'}
        </h1>

        {error && (
          <div
            className="badge badge-danger"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              borderRadius: 'var(--radius-md)',
              justifyContent: 'flex-start',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Test Type selector */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Test Type</label>
            <div className="flex gap-2">
              {[
                { id: 'chapterwise', label: 'Chapter Wise' },
                { id: 'pyq', label: 'PYQ' },
                { id: 'mock', label: 'Mock Test' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTestType(t.id)}
                  className={`btn ${testType === t.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 'var(--radius-xl)', fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            {/* Subject Select */}
            <div className="form-group">
              <label htmlFor="subjectSelect" className="form-label">Subject</label>
              <select
                id="subjectSelect"
                className="form-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Name */}
            <div className="form-group">
              <label htmlFor="testName" className="form-label">Name of Test</label>
              <input
                type="text"
                id="testName"
                className="form-input"
                placeholder="Enter Name of Test"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Topics Multiselect */}
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Topics</label>
            {topics.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem' }}>
                Please select a Subject first to view Topics.
              </div>
            ) : (
              <div className="pill-container">
                {topics.map((topic) => {
                  const isActive = selectedTopicIds.includes(topic.id);
                  return (
                    <button
                      type="button"
                      key={topic.id}
                      onClick={() => handleTopicToggle(topic.id)}
                      className={`pill-tag ${isActive ? 'pill-tag-active' : 'pill-tag-inactive'}`}
                    >
                      {topic.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-Topics Multiselect */}
          <div className="form-group" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
            <label className="form-label">Sub Topics</label>
            {selectedTopicIds.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem' }}>
                Select one or more Topics to view Sub Topics.
              </div>
            ) : subTopics.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem' }}>
                No Sub Topics found for selected Topics.
              </div>
            ) : (
              <div className="pill-container">
                {subTopics.map((sub) => {
                  const isActive = selectedSubTopicIds.includes(sub.id);
                  return (
                    <button
                      type="button"
                      key={sub.id}
                      onClick={() => handleSubTopicToggle(sub.id)}
                      className={`pill-tag ${isActive ? 'pill-tag-active' : 'pill-tag-inactive'}`}
                      style={{
                        backgroundColor: isActive ? 'var(--warning-color)' : 'white',
                        color: isActive ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-row" style={{ marginTop: '1.5rem' }}>
            {/* Duration */}
            <div className="form-group">
              <label htmlFor="testDuration" className="form-label">Duration (Minutes)</label>
              <input
                type="number"
                id="testDuration"
                className="form-input"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={1}
                required
              />
            </div>

            {/* Difficulty Radio Group */}
            <div className="form-group">
              <label className="form-label">Test Difficulty Level</label>
              <div className="radio-group" style={{ marginTop: '0.5rem' }}>
                {['easy', 'medium', 'difficult'].map((level) => (
                  <label key={level} className="radio-label">
                    <input
                      type="radio"
                      name="difficulty"
                      className="radio-input"
                      checked={difficulty === level}
                      onChange={() => setDifficulty(level)}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{level}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Marking Scheme */}
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              marginTop: '2.5rem',
              marginBottom: '1rem',
              borderBottom: '1px dashed var(--border-color)',
              paddingBottom: '0.5rem',
            }}
          >
            Marking Scheme
          </h3>

          <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            {/* Wrong Answer */}
            <div className="form-group">
              <label className="form-label">Wrong Answer</label>
              <div className="spinner-input">
                <div className="spinner-btn" onClick={() => setWrongMarks((p) => p - 1)}>-</div>
                <input
                  type="number"
                  className="spinner-val"
                  value={wrongMarks}
                  onChange={(e) => setWrongMarks(Number(e.target.value))}
                />
                <div className="spinner-btn" onClick={() => setWrongMarks((p) => p + 1)}>+</div>
              </div>
            </div>

            {/* Unattempted */}
            <div className="form-group">
              <label className="form-label">Unattempted</label>
              <div className="spinner-input">
                <div className="spinner-btn" onClick={() => setUnattemptMarks((p) => p - 1)}>-</div>
                <input
                  type="number"
                  className="spinner-val"
                  value={unattemptMarks}
                  onChange={(e) => setUnattemptMarks(Number(e.target.value))}
                />
                <div className="spinner-btn" onClick={() => setUnattemptMarks((p) => p + 1)}>+</div>
              </div>
            </div>

            {/* Correct Answer */}
            <div className="form-group">
              <label className="form-label">Correct Answer</label>
              <div className="spinner-input">
                <div className="spinner-btn" onClick={() => setCorrectMarks((p) => p - 1)}>-</div>
                <input
                  type="number"
                  className="spinner-val"
                  value={correctMarks}
                  onChange={(e) => setCorrectMarks(Number(e.target.value))}
                />
                <div className="spinner-btn" onClick={() => setCorrectMarks((p) => p + 1)}>+</div>
              </div>
            </div>

            {/* Number of Questions */}
            <div className="form-group">
              <label className="form-label">No of Questions</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ex 50 Questions"
                value={noOfQuestions}
                onChange={(e) => setNoOfQuestions(Number(e.target.value))}
                min={1}
                required
              />
            </div>

            {/* Total Marks */}
            <div className="form-group">
              <label className="form-label">Total Marks</label>
              <input
                type="number"
                className="form-input"
                style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}
                value={totalMarks}
                disabled
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              id="btn_submit_test"
            >
              {submitting ? 'Saving...' : isEditMode ? 'Save & Edit Questions' : 'Next: Add Questions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditTest;
