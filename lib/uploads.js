import path from 'path';

export const resolveUploadDir = ({ isProduction, projectRootDir }) => {
  const isVercelRuntime = process.env.VERCEL === '1';
  const configuredUploadDir = process.env.UPLOAD_DIR || process.env.UPLOAD_PATH;

  if (isProduction || isVercelRuntime) {
    if (configuredUploadDir && path.isAbsolute(configuredUploadDir)) {
      return configuredUploadDir;
    }

    return '/tmp/uploads';
  }

  if (configuredUploadDir) {
    return path.isAbsolute(configuredUploadDir)
      ? configuredUploadDir
      : path.resolve(projectRootDir, configuredUploadDir);
  }

  return path.join(projectRootDir, 'uploads');
};
