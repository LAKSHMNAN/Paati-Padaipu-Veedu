import { useState } from "react";

import { loginUser, registerUser } from "../services/api";

const buildErrorMessage = (detail) => {
  if (!detail) {
    return "Something went wrong.";
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (detail.detail) {
    return detail.detail;
  }
  return Object.entries(detail)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(" ") : value}`)
    .join(" ");
};

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [formState, setFormState] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegistering = mode === "register";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await registerUser(formState);
        setMode("login");
        setFeedback("Registration successful. Please login.");
        setFormState((current) => ({
          ...current,
          password: "",
          password_confirm: "",
        }));
        return;
      }
      const user = await loginUser({
        username: formState.username,
        password: formState.password,
      });
      onAuthenticated(user);
    } catch (submitError) {
      setError(buildErrorMessage(submitError.response?.data));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isRegistering ? "login" : "register");
    setError("");
    setFeedback("");
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-panel__copy">
          <p className="eyebrow">Secure Access</p>
          <h1>ஸ்ரீ உடையம்மை பாட்டி படைப்பு வீடு</h1>
          <p>Register once, then sign in to manage members, auction transactions, donations, deposits, and reports.</p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">{isRegistering ? "Create Account" : "Welcome Back"}</p>
            <h2>{isRegistering ? "Register" : "Login"}</h2>
          </div>

          <label>
            <span>Username</span>
            <input name="username" value={formState.username} onChange={handleChange} required autoComplete="username" />
          </label>

          {isRegistering ? (
            <label>
              <span>Email</span>
              <input name="email" type="email" value={formState.email} onChange={handleChange} autoComplete="email" />
            </label>
          ) : null}

          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={formState.password}
              onChange={handleChange}
              required
              autoComplete={isRegistering ? "new-password" : "current-password"}
            />
          </label>

          {isRegistering ? (
            <label>
              <span>Confirm Password</span>
              <input
                name="password_confirm"
                type="password"
                value={formState.password_confirm}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </label>
          ) : null}

          {error ? <p className="status-message status-message--error">{error}</p> : null}
          {feedback ? <p className="status-message status-message--success">{feedback}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : isRegistering ? "Register and Login" : "Login"}
          </button>

          <button type="button" className="ghost-button" onClick={switchMode}>
            {isRegistering ? "Already registered? Login" : "New user? Register"}
          </button>
        </form>
      </section>
    </main>
  );
}
