import axios from 'axios';

// Use relative path so Netlify and Vite proxies handle CORS
const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to insert the JWT token in authorization header
api.interceptors.request.use(
  (config) => {
    // Never send saved token on the login request itself
    if (config.url?.includes('/auth/login')) return config;
    const token = localStorage.getItem('preproute_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid, logout user
      localStorage.removeItem('preproute_token');
      localStorage.removeItem('preproute_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper: extract data from API response regardless of format
// API may return { success: true, data: ... } OR { status: "success", data: ... }
function extractData<T>(responseData: any): T {
  if (responseData && responseData.data !== undefined) {
    return responseData.data as T;
  }
  return responseData as T;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export interface SubTopic {
  id: string;
  name: string;
  topic_id: string;
}

export interface Question {
  id?: string;
  type: string; // 'mcq'
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: string; // 'option1', 'option2', etc.
  explanation?: string;
  difficulty?: string; // 'easy', 'medium', 'difficult'
  subject?: string;
  topic?: string;
  sub_topic?: string;
  paragraph?: string;
  media_url?: string;
  category?: string;
  test_id?: string;
}

export interface Test {
  id?: string;
  name: string;
  type: string;
  subject: string;
  topics: string[];
  sub_topics: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: string;
  total_time: number;
  total_marks: number;
  total_questions: number;
  // Backend accepts: live | draft | unpublished | scheduled | expired (never null)
  status: 'draft' | 'live' | 'unpublished' | 'scheduled' | 'expired';
  created_at?: string;
  questions?: string[];
}

// API methods
export const authService = {
  login: async (userId: string, password: string) => {
    const response = await api.post('/auth/login', { userId, password });
    return response.data;
  },
};

export const subjectService = {
  getSubjects: async (): Promise<Subject[]> => {
    const response = await api.get('/subjects');
    const data = extractData<any[]>(response.data);
    return (Array.isArray(data) ? data : []).map((item) => ({
      id: item.id || item.subject_id || item._id || item.subjectId,
      name: item.name || item.subject_name || item.subjectName || item.title,
    }));
  },
};

export const topicService = {
  getTopicsBySubject: async (subjectId: string): Promise<Topic[]> => {
    const response = await api.get(`/topics/subject/${subjectId}`);
    const data = extractData<any[]>(response.data);
    return (Array.isArray(data) ? data : []).map((item) => ({
      id: item.id || item.topic_id || item._id || item.topicId,
      name: item.name || item.topic_name || item.topicName || item.title,
      subject_id: item.subject_id || item.subjectId || subjectId,
    }));
  },
};

export const subTopicService = {
  getSubTopicsByTopic: async (topicId: string): Promise<SubTopic[]> => {
    const response = await api.get(`/sub-topics/topic/${topicId}`);
    const data = extractData<any[]>(response.data);
    return (Array.isArray(data) ? data : []).map((item) => ({
      id: item.id || item.sub_topic_id || item._id || item.subTopicId,
      name: item.name || item.sub_topic_name || item.subTopicName || item.title,
      topic_id: item.topic_id || item.topicId || topicId,
    }));
  },
  getSubTopicsMultiTopics: async (topicIds: string[]): Promise<SubTopic[]> => {
    const response = await api.post('/sub-topics/multi-topics', { topicIds });
    const data = extractData<any[]>(response.data);
    return (Array.isArray(data) ? data : []).map((item) => ({
      id: item.id || item.sub_topic_id || item._id || item.subTopicId,
      name: item.name || item.sub_topic_name || item.subTopicName || item.title,
      topic_id: item.topic_id || item.topicId,
    }));
  },
};

export const testService = {
  getTests: async (): Promise<Test[]> => {
    const response = await api.get('/tests');
    const data = extractData<Test[]>(response.data);
    return Array.isArray(data) ? data : [];
  },
  getTestById: async (id: string): Promise<Test> => {
    const response = await api.get(`/tests/${id}`);
    const data = extractData<Test>(response.data);
    // If data is array, pick first
    return Array.isArray(data) ? data[0] : data;
  },
  createTest: async (testData: Omit<Test, 'id' | 'created_at'>) => {
    const response = await api.post('/tests', testData);
    return response.data;
  },
  updateTest: async (id: string, testData: Partial<Test>) => {
    const response = await api.put(`/tests/${id}`, testData);
    return response.data;
  },
  publishTest: async (id: string) => {
    // UUID v4 pattern
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = (v: string) => UUID_REGEX.test(v);
    const getName = (item: any) =>
      item.name || item.subject_name || item.subjectName ||
      item.topic_name || item.topicName || item.sub_topic_name ||
      item.subTopicName || item.title || '';
    const getId = (item: any) =>
      item.id || item.subject_id || item.topic_id || item.sub_topic_id ||
      item._id || item.subjectId || item.topicId || item.subTopicId || '';
    const resolveToUUIDs = (values: string[], list: any[]): string[] =>
      values.map((v) => {
        if (isUUID(v)) return v;
        const match = list.find((item) => getName(item).toLowerCase() === v.toLowerCase());
        return match ? getId(match) || v : v;
      });

    const testRes = await api.get(`/tests/${id}`);
    const raw = Array.isArray(testRes.data?.data)
      ? testRes.data.data[0]
      : testRes.data?.data || testRes.data;

    // 1. Resolve subject name → UUID
    let subjectUUID: string = raw.subject_id || raw.subjectId || raw.subject || '';
    if (!isUUID(subjectUUID)) {
      const subjectsRes = await api.get('/subjects');
      const subjectsData = subjectsRes.data?.data ?? subjectsRes.data;
      const subjectsList: any[] = Array.isArray(subjectsData) ? subjectsData : [];
      const match = subjectsList.find(
        (s: any) => getName(s).toLowerCase() === subjectUUID.toLowerCase()
      );
      if (match) subjectUUID = getId(match) || subjectUUID;
    }

    // 2. Resolve topics name array → UUID array
    const rawTopics: string[] = Array.isArray(raw.topics) ? raw.topics : [];
    let resolvedTopics: string[] = rawTopics;
    if (rawTopics.some((t) => !isUUID(t)) && subjectUUID) {
      const topicsRes = await api.get(`/topics/subject/${subjectUUID}`);
      const topicsData = topicsRes.data?.data ?? topicsRes.data;
      const topicsList: any[] = Array.isArray(topicsData) ? topicsData : [];
      resolvedTopics = resolveToUUIDs(rawTopics, topicsList);
    }

    // 3. Resolve sub_topics name array → UUID array
    const rawSubTopics: string[] = Array.isArray(raw.sub_topics) ? raw.sub_topics : [];
    let resolvedSubTopics: string[] = rawSubTopics;
    if (rawSubTopics.some((t) => !isUUID(t)) && resolvedTopics.length > 0) {
      const stRes = await api.post('/sub-topics/multi-topics', { topicIds: resolvedTopics });
      const stData = stRes.data?.data ?? stRes.data;
      const subTopicsList: any[] = Array.isArray(stData) ? stData : [];
      resolvedSubTopics = resolveToUUIDs(rawSubTopics, subTopicsList);
    }

    // Build a clean payload — only fields the PUT validator accepts
    const payload: Record<string, any> = {
      name: raw.name,
      type: raw.type,
      subject: subjectUUID,
      topics: resolvedTopics,
      sub_topics: resolvedSubTopics,
      correct_marks: raw.correct_marks,
      wrong_marks: raw.wrong_marks,
      unattempt_marks: raw.unattempt_marks,
      difficulty: raw.difficulty,
      total_time: raw.total_time,
      total_marks: raw.total_marks,
      total_questions: raw.total_questions,
      status: 'live',
    };

    // Include optional fields only when they are non-null / non-undefined
    if (raw.slot != null) payload.slot = raw.slot;
    if (raw.hidden_from_moderator != null) payload.hidden_from_moderator = raw.hidden_from_moderator;
    if (Array.isArray(raw.paragraph_question)) payload.paragraph_question = raw.paragraph_question;
    if (raw.scheduled_date != null) payload.scheduled_date = raw.scheduled_date;
    if (raw.expiry_date != null) payload.expiry_date = raw.expiry_date;
    if (Array.isArray(raw.questions)) payload.questions = raw.questions;

    const response = await api.put(`/tests/${id}`, payload);
    return response.data;
  },
  deleteTest: async (id: string) => {
    const response = await api.delete(`/tests/${id}`);
    return response.data;
  },
};

export const questionService = {
  bulkCreateQuestions: async (questions: Question[]) => {
    const response = await api.post('/questions/bulk', { questions });
    return response.data;
  },
  bulkUpdateQuestions: async (questions: Question[]) => {
    const response = await api.put('/questions/bulk', { questions });
    return response.data;
  },
  fetchBulkQuestions: async (questionIds: string[]): Promise<Question[]> => {
    const response = await api.post('/questions/fetchBulk', { question_ids: questionIds });
    const data = extractData<Question[]>(response.data);
    return Array.isArray(data) ? data : [];
  },
};
