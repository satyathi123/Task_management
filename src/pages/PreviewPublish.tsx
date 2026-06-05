import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, Edit3, FileText, BarChart2 } from 'lucide-react';
import { testService, questionService, Test, Question } from '../services/api';
import Loader from '../components/Loader';
import { showPublishSuccess } from '../utils/swal';
import '../styles/components.css';

const PreviewPublish: React.FC = () => {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scheduling States
  const [publishType, setPublishType] = useState<'now' | 'schedule'>('now');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [liveUntilType, setLiveUntilType] = useState('always'); // 'always', '1week', '2weeks', '3weeks', '1month', 'custom'
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!testId) return;
      try {
        setLoading(true);
        const testData = await testService.getTestById(testId);
        setTest(testData);

        if (testData.questions && testData.questions.length > 0) {
          const qList = await questionService.fetchBulkQuestions(testData.questions);
          setQuestions(qList || []);
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch test details for preview.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [testId]);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      await testService.publishTest(testId!);
      await showPublishSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Failed to publish the test. Please try again.'
      );
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <Loader />;
  if (!test) return <div className="card text-center">Test details not found.</div>;

  return (
    <div className="content-container fade-in">
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Outfit' }}>
          Preview &amp; Publish
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Review the test settings and questions before making it live on the platform.
        </p>
      </div>

      {error && (
        <div
          className="badge badge-danger"
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            justifyContent: 'flex-start',
          }}
        >
          {error}
        </div>
      )}

      {/* Test details overview card */}
      <div className="card flex flex-column gap-4" style={{ borderLeft: '4px solid var(--primary-color)' }}>
        <div className="flex justify-between items-start">
          <div className="flex flex-column gap-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-primary" style={{ backgroundColor: 'var(--text-primary)', color: 'white', textTransform: 'capitalize' }}>
                {test.type === 'pyq' ? 'PYQ' : test.type === 'chapterwise' ? 'Chapter Wise' : test.type === 'mock' ? 'Mock Test' : test.type}
              </span>
              <span className="badge badge-success" style={{ backgroundColor: 'var(--tag-easy-bg)', color: 'var(--tag-easy-text)' }}>
                {test.difficulty}
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{test.name}</h2>
          </div>

          <button
            onClick={() => navigate(`/test/edit/${testId}`)}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Edit3 size={16} /> Edit Config
          </button>
        </div>

        <div
          className="flex justify-between items-center"
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <div style={{ fontSize: '0.9rem' }}>
            Subject: <strong style={{ color: 'var(--primary-color)' }}>{test.subject}</strong>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Clock size={16} />
              <span>{test.total_time} Min</span>
            </div>
            <div className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <FileText size={16} />
              <span>{questions.length} Questions</span>
            </div>
            <div className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <BarChart2 size={16} />
              <span>{test.total_marks} Marks</span>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <strong>Marking Scheme:</strong> Correct: <span style={{ color: 'var(--success-dark)', fontWeight: 600 }}>+{test.correct_marks}</span> |
          Wrong: <span style={{ color: 'var(--danger-dark)', fontWeight: 600 }}>{test.wrong_marks}</span> |
          Unattempted: <span style={{ fontWeight: 600 }}>{test.unattempt_marks}</span>
        </div>
      </div>

      {/* Publish Settings Selector */}
      <div className="card flex flex-column gap-6">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Publish Options</h3>

        <div className="flex gap-4">
          <button
            type="button"
            className={`btn ${publishType === 'now' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPublishType('now')}
            style={{ flex: 1, padding: '1rem' }}
          >
            Publish Now
          </button>
          <button
            type="button"
            className={`btn ${publishType === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPublishType('schedule')}
            style={{ flex: 1, padding: '1rem' }}
            id="btn_schedule_publish"
          >
            Schedule Publish
          </button>
        </div>

        {publishType === 'schedule' && (
          <div className="flex flex-column gap-4 fade-in">
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Select Date and Time</h4>
            <div className="form-row">
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Start Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar
                    size={16}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Start Time</label>
                <div style={{ position: 'relative' }}>
                  <Clock
                    size={16}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '1rem' }}>Live Until</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '-0.75rem' }}>
              Choose how long this test should remain available on the platform.
            </p>

            <div className="radio-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 2rem' }}>
              {[
                { id: 'always', label: 'Always Available' },
                { id: '3weeks', label: '3 Weeks' },
                { id: '1week', label: '1 Week' },
                { id: '1month', label: '1 Month' },
                { id: '2weeks', label: '2 Weeks' },
                { id: 'custom', label: 'Custom Duration' },
              ].map((opt) => (
                <label key={opt.id} className="radio-label">
                  <input
                    type="radio"
                    name="liveUntil"
                    className="radio-input"
                    checked={liveUntilType === opt.id}
                    onChange={() => setLiveUntilType(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            {liveUntilType === 'custom' && (
              <div className="form-row fade-in" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Select End Date</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar
                      size={16}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Select End Time</label>
                  <div style={{ position: 'relative' }}>
                    <Clock
                      size={16}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="time"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/test/${testId}/questions`)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={publishing}
            id="btn_confirm_publish"
          >
            {publishing ? 'Publishing...' : 'Confirm'}
          </button>
        </div>
      </div>

      {/* Question Sheet Preview */}
      <div className="flex flex-column gap-4" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Outfit' }}>
          Question Sheet ({questions.length} Items)
        </h3>

        {questions.map((q, idx) => (
          <div key={q.id || idx} className="card flex flex-column gap-3">
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Question {idx + 1}</span>
              {q.difficulty && (
                <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                  {q.difficulty}
                </span>
              )}
            </div>

            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{q.question}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
              {[1, 2, 3, 4].map((num) => {
                const optKey = `option${num}` as keyof Question;
                const optVal = q[optKey] as string;
                const isCorrect = q.correct_option === `option${num}`;

                return (
                  <div
                    key={num}
                    style={{
                      padding: '0.6rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isCorrect ? 'var(--success-color)' : 'var(--border-color)'}`,
                      backgroundColor: isCorrect ? 'var(--success-light)' : 'transparent',
                      color: isCorrect ? 'var(--success-dark)' : 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: isCorrect ? 600 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ color: isCorrect ? 'var(--success-color)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                      {num}.
                    </span>
                    {optVal}
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  borderLeft: '3px solid var(--text-muted)',
                }}
              >
                <strong>Solution:</strong> {q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviewPublish;
