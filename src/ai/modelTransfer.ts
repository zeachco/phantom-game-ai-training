import { fileUtilities } from './utils';

/** snapshot of a game's stored models, exchanged as a JSON file */
export interface ModelArchive {
  game: string;
  savedAt: string;
  models: Record<string, unknown>;
}

export function buildModelArchive(game: string): ModelArchive {
  return {
    game,
    savedAt: new Date().toISOString(),
    models: fileUtilities(game).exportModels(),
  };
}

/** writes the stored models of a game to disk as a downloaded JSON file */
export function downloadModelArchive(game: string) {
  const archive = buildModelArchive(game);
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
  const blob = new Blob([JSON.stringify(archive, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${game}_models_${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** opens a file picker and resolves with the parsed model archive */
export function pickModelArchive(): Promise<ModelArchive> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return reject(new Error('No file selected'));
      file.text().then((text) => {
        try {
          const archive = JSON.parse(text);
          if (
            !archive ||
            typeof archive !== 'object' ||
            !archive.models ||
            typeof archive.models !== 'object'
          ) {
            reject(new Error('Not a model archive, expected { game, models }'));
            return;
          }
          resolve(archive as ModelArchive);
        } catch (err) {
          reject(err);
        }
      });
    };
    input.click();
  });
}
