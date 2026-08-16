// Supabase is never reached in tests. Any module that imports the client gets
// this stub, so a missing mock surfaces as an obvious undefined rather than a
// real network call against the production project.
jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn(), signInWithPassword: jest.fn(), signOut: jest.fn() },
  },
}));
