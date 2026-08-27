/**
 * Centralized test data for SauceDemo's built-in accounts.
 *
 * Why not inline "standard_user" / "secret_sauce" strings in every test?
 * Two reasons interviewers usually want to hear:
 *  1. Single source of truth — if a credential ever needs to change, it
 *     changes in one place.
 *  2. Self-documenting tests — `login(users.standardUser)` communicates intent
 *     better than a bare string, and TypeScript autocompletes the valid users.
 */
export interface SauceDemoUser {
  username: string;
  password: string;
  description: string;
}

const PASSWORD = 'secret_sauce';

export const users = {
  /** Logs in normally with no injected quirks — the "happy path" account. */
  standardUser: {
    username: 'standard_user',
    password: PASSWORD,
    description: 'Regular user with no restrictions',
  },
  /** SauceDemo explicitly blocks this account — used for negative login tests. */
  lockedOutUser: {
    username: 'locked_out_user',
    password: PASSWORD,
    description: 'Account disabled by the application',
  },
  /** Logs in fine but the UI misbehaves (wrong images, sort issues, etc.). */
  problemUser: {
    username: 'problem_user',
    password: PASSWORD,
    description: 'Logs in but exhibits UI bugs',
  },
  /** Logs in fine but every action is artificially slowed down. */
  performanceGlitchUser: {
    username: 'performance_glitch_user',
    password: PASSWORD,
    description: 'Logs in but responds slowly',
  },
} as const satisfies Record<string, SauceDemoUser>;

/** A deliberately wrong password, used to test the "invalid credentials" flow. */
export const invalidPassword = 'wrong_password';
