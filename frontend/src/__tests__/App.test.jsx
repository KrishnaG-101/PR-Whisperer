import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';

// Mock API functions
vi.mock('../api', () => ({
  fetchHealth: vi.fn().mockResolvedValue({
    status: 'healthy',
    version: '1.0.0',
    db_connected: true,
    telemetry_active: true,
    active_incidents_count: 0,
  }),
  fetchPRs: vi.fn().mockResolvedValue([
    {
      id: 'PR-101',
      title: 'feat(payments): Add Stripe webhook retry & customer charge endpoint',
      repo_name: 'acme/payment-service',
      pr_number: '101',
      author: 'alice',
      branch_source: 'feat/stripe-webhook',
      branch_target: 'main',
      files_changed_count: 2,
      latest_readiness_score: 25,
      created_at: '2026-10-23T10:00:00Z',
    },
    {
      id: 'PR-102',
      title: 'refactor(auth): Async session middleware & JWT token refresh',
      repo_name: 'acme/auth-service',
      pr_number: '102',
      author: 'bob',
      branch_source: 'refactor/auth-async',
      branch_target: 'main',
      files_changed_count: 1,
      latest_readiness_score: 55,
      created_at: '2026-10-23T10:15:00Z',
    },
  ]),
  fetchPRDetail: vi.fn().mockResolvedValue({
    id: 'PR-101',
    title: 'feat(payments): Add Stripe webhook retry & customer charge endpoint',
    repo_name: 'acme/payment-service',
    pr_number: '101',
    author: 'alice',
    branch_source: 'feat/stripe-webhook',
    branch_target: 'main',
    files_changed_count: 2,
    latest_readiness_score: 25,
    created_at: '2026-10-23T10:00:00Z',
    diff_text: 'diff --git a/payments.py b/payments.py\n+stripe.api_key = "sk_live_DEMO_MOCK_STRIPE_KEY_TESTING_ONLY"',
    changed_files: ['payments.py'],
    sample_voice_prompt: 'Hey, line 14 has a hardcoded stripe live secret key.',
    review_sessions: [],
  }),
  analyzeVoiceReview: vi.fn(),
  runQuerySpeak: vi.fn(),
  fetchTelemetrySummary: vi.fn().mockResolvedValue({
    total_events: 5,
    recent_traces: [],
    metrics: {},
    active_incidents: [],
  }),
  triggerIncidentAndRespond: vi.fn(),
  createCustomPR: vi.fn(),
}));

describe('PR-Whisperer Frontend Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PR-Whisperer header and live status badge', async () => {
    render(<App />);

    expect(screen.getByText('PR-Whisperer')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('DB Connected')).toBeInTheDocument();
    });
  });

  it('renders the Wispr Flow voice command dock and load sample button', async () => {
    render(<App />);

    expect(screen.getByPlaceholderText(/Speak with Wispr Flow/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1-Click Load Sample Spoken Review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze Spoken Review/i })).toBeInTheDocument();
  });

  it('renders the QuerySpeak cross-PR voice audit search bar', async () => {
    render(<App />);

    expect(screen.getByPlaceholderText(/QuerySpeak: Ask via Wispr Flow/i)).toBeInTheDocument();
    expect(screen.getByText('Critical security issues in payments')).toBeInTheDocument();
    expect(screen.getByText('All OpenAPI contract drift warnings')).toBeInTheDocument();
    expect(screen.getByText('N+1 performance bottlenecks')).toBeInTheDocument();
  });

  it('renders the pre-seeded PR queue in the left sidebar', async () => {
    render(<App />);

    await waitFor(() => {
      const pr101Elements = screen.getAllByText('PR-101');
      expect(pr101Elements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('PR-102')).toBeInTheDocument();
    });
  });
});
