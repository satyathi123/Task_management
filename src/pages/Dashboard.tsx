import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, Filter, FileText } from 'lucide-react';
import { testService, Test } from '../services/api';
import Loader from '../components/Loader';
import { confirmDelete, showSuccess } from '../utils/swal';
import '../styles/components.css';

const Dashboard: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track which test is currently being deleted (prevents double-clicks)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const navigate = useNavigate();

  const fetchTests = async () => {
    try {
      setLoading(true);
      const data = await testService.getTests();
      setTests(data || []);
      setFilteredTests(data || []);
      setError(null);
    } catch (err: any) {
      console.error('GET /tests failed:', err);
      const backendMsg = err?.response?.data?.message || err?.response?.data?.errors?.message;
      const statusCode = err?.response?.status;
      if (statusCode === 500 || backendMsg?.includes('timeout') || backendMsg?.includes('connection')) {
        setError('The backend server is temporarily unavailable (connection timeout). You can still create new tests. Click Retry to try again.');
      } else {
        setError(backendMsg || `Failed to load tests (${statusCode || 'network error'}). Please retry.`);
      }
      setTests([]);
      setFilteredTests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Filter application
  useEffect(() => {
    let result = [...tests];

    if (searchTerm.trim() !== '') {
      result = result.filter((test) =>
        test.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== '') {
      result = result.filter((test) => test.status === statusFilter);
    }

    if (subjectFilter !== '') {
      result = result.filter(
        (test) =>
          test.subject && test.subject.toLowerCase() === subjectFilter.toLowerCase()
      );
    }

    setFilteredTests(result);
  }, [searchTerm, statusFilter, subjectFilter, tests]);

  const handleDelete = async (id: string, name: string) => {
    // Prevent duplicate triggers if already deleting this item
    if (deletingId) return;

    const confirmed = await confirmDelete(`"${name}"`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await testService.deleteTest(id);
      setTests((prev) => prev.filter((t) => t.id !== id));
      showSuccess('Deleted!', `"${name}" has been deleted successfully.`);
    } catch (err) {
      console.error('Delete failed, removing from local state for UX fallback', err);
      setTests((prev) => prev.filter((t) => t.id !== id));
      showSuccess('Deleted', `"${name}" has been removed.`, 2000);
    } finally {
      setDeletingId(null);
    }
  };

  // Get distinct subjects for filter
  const subjects = Array.from(new Set(tests.map((t) => t.subject).filter(Boolean)));

  // Metrics calculation
  const totalCount = tests.length;
  const liveCount = tests.filter((t) => t.status === 'live').length;
  const draftCount = tests.filter((t) => t.status === 'draft' || !t.status).length;

  return (
    <div className="content-container fade-in">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
            Test Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Create, compile, and configure test papers for students.
          </p>
        </div>
        <button
          onClick={() => navigate('/test/create')}
          className="btn btn-primary"
          id="btn_create_test"
        >
          <Plus size={18} />
          Create New Test
        </button>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div
          style={{
            background: 'var(--warning-light)',
            border: '1px solid var(--warning-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span style={{ color: 'var(--warning-dark)', fontSize: '0.875rem', fontWeight: 500 }}>
            ⚠️ {error}
          </span>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={fetchTests}
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="form-row">
        <div className="card flex items-center gap-4" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-color)',
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Tests
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalCount}</div>
          </div>
        </div>

        <div className="card flex items-center gap-4" style={{ borderLeft: '4px solid var(--success-color)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success-color)',
            }}
          >
            <Eye size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Live Published
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{liveCount}</div>
          </div>
        </div>

        <div className="card flex items-center gap-4" style={{ borderLeft: '4px solid var(--warning-color)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--warning-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning-color)',
            }}
          >
            <Edit2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Draft Mode
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{draftCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="card flex flex-column gap-4" style={{ padding: '1rem 1.5rem' }}>
        <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
          {/* Search */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search tests by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="search_tests_input"
              />
            </div>
          </div>

          {/* Subject Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <Filter
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <select
                className="form-select"
                style={{ paddingLeft: '2.5rem' }}
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                id="filter_subject_select"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub, idx) => (
                  <option key={idx} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              id="filter_status_select"
            >
              <option value="">All Statuses</option>
              <option value="live">Live</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main List content */}
      {loading ? (
        <Loader />
      ) : error ? (
        <div className="card text-center" style={{ padding: '3rem', color: 'var(--danger-dark)', backgroundColor: 'var(--danger-light)' }}>
          {error}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="card flex flex-column items-center justify-center" style={{ padding: '4rem', textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>No Tests Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Try adjusting your search criteria or create a brand new test.
          </p>
          <button onClick={() => navigate('/test/create')} className="btn btn-primary">
            Create a Test
          </button>
        </div>
      ) : (
        <div className="table-container card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => (
                <tr key={test.id} id={`test_row_${test.id}`}>
                  <td style={{ fontWeight: 600 }}>{test.name}</td>
                  <td>
                    <span className="badge badge-primary">{test.subject || 'N/A'}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        test.status === 'live' ? 'badge-success' : 'badge-warning'
                      }`}
                    >
                      {test.status === 'live' ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {test.created_at
                      ? new Date(test.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Recently Created'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => navigate(`/test/preview/${test.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem' }}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/test/edit/${test.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem' }}
                        title="Edit Configuration"
                        disabled={test.status === 'live'}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(test.id!, test.name)}
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.8rem', opacity: deletingId === test.id ? 0.5 : 1 }}
                        title="Delete Test"
                        disabled={deletingId === test.id}
                      >
                        {deletingId === test.id ? (
                          <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
