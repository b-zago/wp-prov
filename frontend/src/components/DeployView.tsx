import { useState } from "react";
import type { DeployPayload, DeployResponse } from "../lib/types";
import { SpinnerIcon } from "./icons";

type Props = {
  atLimit: boolean;
  limit: number | null;
  count: number;
  onDeploy: (payload: DeployPayload) => Promise<DeployResponse>;
};

const SUBDOMAIN_SUFFIX = ".zagoapps.com";

const FIELDS: Array<keyof DeployPayload> = [
  "releaseName",
  "subdomain",
  "title",
  "wpMail",
  "wpUser",
  "wpPassword",
  "dbUser",
  "dbPassword",
  "dbRootPassword",
  "sftpUser",
  "sftpPassword",
];

const EMPTY: DeployPayload = {
  releaseName: "",
  subdomain: "",
  title: "",
  wpMail: "",
  wpUser: "",
  wpPassword: "",
  dbUser: "",
  dbPassword: "",
  dbRootPassword: "",
  sftpUser: "",
  sftpPassword: "",
};

const RELEASE_RE = /^[a-z0-9][a-z0-9-]{0,52}[a-z0-9]$/;
// Single DNS label — no dots, so only one subdomain level is allowed.
const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(
  key: keyof DeployPayload,
  value: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Required";
  switch (key) {
    case "releaseName":
      return RELEASE_RE.test(trimmed)
        ? null
        : "Lowercase letters, digits and hyphens only, 2-54 chars";
    case "subdomain":
      return SUBDOMAIN_RE.test(trimmed)
        ? null
        : "Single DNS label — letters, digits, hyphens, up to 63 chars, no dots";
    case "wpMail":
      return EMAIL_RE.test(trimmed) ? null : "Must be a valid email address";
    default:
      return null;
  }
}

type Errors = Partial<Record<keyof DeployPayload, string>>;

type Result =
  | { kind: "success"; data: DeployResponse }
  | { kind: "error"; message: string };

export default function DeployView({
  atLimit,
  limit,
  count,
  onDeploy,
}: Props) {
  const [values, setValues] = useState<DeployPayload>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  function update<K extends keyof DeployPayload>(
    key: K,
    value: DeployPayload[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (atLimit) {
      setResult({
        kind: "error",
        message: `You have ${count} of ${limit} allowed instances. Delete one before deploying a new instance.`,
      });
      return;
    }

    const nextErrors: Errors = {};
    FIELDS.forEach((k) => {
      const msg = validateField(k, values[k]);
      if (msg) nextErrors[k] = msg;
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setResult({
        kind: "error",
        message: "Please fix the highlighted fields.",
      });
      return;
    }

    const payload: DeployPayload = {
      ...values,
      releaseName: values.releaseName.trim(),
      subdomain: values.subdomain.trim(),
      title: values.title.trim(),
      wpMail: values.wpMail.trim(),
    };

    setLoading(true);
    setResult(null);
    try {
      const data = await onDeploy(payload);
      setResult({ kind: "success", data });
      setValues(EMPTY);
      setErrors({});
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  const subdomainPreview = values.subdomain.trim()
    ? `${values.subdomain.trim()}${SUBDOMAIN_SUFFIX}`
    : `your-subdomain${SUBDOMAIN_SUFFIX}`;

  return (
    <section>
      <header className="page-header">
        <div>
          <h1 className="page-title">Deploy instance</h1>
          <p className="page-subtitle">
            Provision a new WordPress deployment
          </p>
        </div>
      </header>

      {atLimit && (
        <div className="result-banner is-error mb-5">
          <div className="result-title">Instance limit reached</div>
          <div>
            You have {count} of {limit} allowed instances. Delete one before
            deploying a new instance.
          </div>
        </div>
      )}

      <form className="form-shell" onSubmit={handleSubmit} noValidate>
        <FormSection legend="General">
          <div className="field-grid">
            <TextField
              id="releaseName"
              label="Release name"
              value={values.releaseName}
              onChange={(v) => update("releaseName", v)}
              error={errors.releaseName}
              placeholder="my-site"
              hint="Lowercase, alphanumeric, hyphens only"
              autoComplete="off"
            />
            <TextField
              id="subdomain"
              label="Subdomain"
              value={values.subdomain}
              onChange={(v) => update("subdomain", v)}
              error={errors.subdomain}
              placeholder="wp1"
              suffix={SUBDOMAIN_SUFFIX}
              hint={`URL will be https://${subdomainPreview}`}
              autoComplete="off"
            />
            <TextField
              id="title"
              label="Site title"
              value={values.title}
              onChange={(v) => update("title", v)}
              error={errors.title}
              placeholder="My WordPress Site"
            />
            <TextField
              id="wpMail"
              label="Admin email"
              type="email"
              value={values.wpMail}
              onChange={(v) => update("wpMail", v)}
              error={errors.wpMail}
              placeholder="admin@example.com"
            />
          </div>
        </FormSection>

        <FormSection legend="WordPress credentials">
          <div className="field-grid">
            <TextField
              id="wpUser"
              label="Admin username"
              value={values.wpUser}
              onChange={(v) => update("wpUser", v)}
              error={errors.wpUser}
              placeholder="admin"
              autoComplete="off"
            />
            <TextField
              id="wpPassword"
              label="Admin password"
              type="password"
              value={values.wpPassword}
              onChange={(v) => update("wpPassword", v)}
              error={errors.wpPassword}
              placeholder="••••••••"
            />
          </div>
        </FormSection>

        <FormSection legend="Database">
          <div className="field-grid">
            <TextField
              id="dbUser"
              label="DB username"
              value={values.dbUser}
              onChange={(v) => update("dbUser", v)}
              error={errors.dbUser}
              placeholder="wordpress"
              autoComplete="off"
            />
            <TextField
              id="dbPassword"
              label="DB password"
              type="password"
              value={values.dbPassword}
              onChange={(v) => update("dbPassword", v)}
              error={errors.dbPassword}
              placeholder="••••••••"
            />
            <TextField
              id="dbRootPassword"
              label="DB root password"
              type="password"
              value={values.dbRootPassword}
              onChange={(v) => update("dbRootPassword", v)}
              error={errors.dbRootPassword}
              placeholder="••••••••"
            />
          </div>
        </FormSection>

        <FormSection legend="SFTP">
          <div className="field-grid">
            <TextField
              id="sftpUser"
              label="SFTP username"
              value={values.sftpUser}
              onChange={(v) => update("sftpUser", v)}
              error={errors.sftpUser}
              placeholder="sftpuser"
              autoComplete="off"
            />
            <TextField
              id="sftpPassword"
              label="SFTP password"
              type="password"
              value={values.sftpPassword}
              onChange={(v) => update("sftpPassword", v)}
              error={errors.sftpPassword}
              placeholder="••••••••"
            />
          </div>
          <p className="field-hint mt-3">Port is assigned automatically.</p>
        </FormSection>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || atLimit}
          >
            {loading ? "Deploying…" : "Deploy"}
            {loading && <SpinnerIcon size={14} />}
          </button>
        </div>

        {result?.kind === "success" && (
          <div className="result-banner is-success">
            <div className="result-title">Instance queued for deployment</div>
            <div className="result-row">
              <span className="result-key">Release</span>
              <span className="result-val">{result.data.releaseName}</span>
            </div>
            <div className="result-row">
              <span className="result-key">SFTP port</span>
              <span className="result-val">{result.data.sftpPort}</span>
            </div>
          </div>
        )}

        {result?.kind === "error" && (
          <div className="result-banner is-error">
            <div className="result-title">Deployment failed</div>
            <div>{result.message}</div>
          </div>
        )}
      </form>
    </section>
  );
}

function FormSection({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-section">
      <div className="form-legend">{legend}</div>
      {children}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  autoComplete?: string;
  suffix?: string;
};

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  error,
  autoComplete,
  suffix,
}: TextFieldProps) {
  const inputClass = `field-input ${error ? "is-error" : ""}`.trim();
  const input = (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={
        suffix ? `${inputClass} flex-1 min-w-0` : inputClass
      }
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
    />
  );

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {suffix ? (
        <div className="flex items-stretch gap-2">
          {input}
          <span className="field-hint self-center whitespace-nowrap font-mono">
            {suffix}
          </span>
        </div>
      ) : (
        input
      )}
      {error ? (
        <span id={`${id}-err`} className="field-hint text-rose-300">
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-hint`} className="field-hint">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
