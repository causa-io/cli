import { BaseConfiguration } from '@causa/workspace';
import { PartialConfiguration } from '@causa/workspace/configuration';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

export async function writeConfiguration(
  baseDir: string,
  relativePath: string,
  configuration: PartialConfiguration<BaseConfiguration>,
): Promise<void> {
  const fullPath = join(baseDir, relativePath);
  const dirPath = dirname(fullPath);

  await mkdir(dirPath, { recursive: true });

  const confStr = JSON.stringify(configuration);
  await writeFile(fullPath, confStr);
}
