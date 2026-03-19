import path from 'path';

export const resolveUploadDir = ({ isProduction, projectRootDir }) => {
  const configuredUploadDir = process.env.UPLOAD_DIR || process.env.UPLOAD_PATH;

  if (isProduction) {
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
