export type Instance = {
  releaseName: string;
  syncStatus: string | null;
  healthStatus: string | null;
  sftpPort: number | null;
  url: string | null;
};

export type InstancesResponse = {
  instances: Instance[];
  limit: number | null;
};

export type DeployPayload = {
  releaseName: string;
  subdomain: string;
  title: string;
  wpMail: string;
  wpUser: string;
  wpPassword: string;
  dbUser: string;
  dbPassword: string;
  dbRootPassword: string;
  sftpUser: string;
  sftpPassword: string;
};

export type DeployResponse = {
  message: string;
  releaseName: string;
  sftpPort: number;
};

export type ApiStatus = "unknown" | "ok" | "err";
export type ViewName = "instances" | "deploy";
