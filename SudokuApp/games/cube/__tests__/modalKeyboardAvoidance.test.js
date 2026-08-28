import fs from 'fs';
import path from 'path';

/**
 * A native Modal is rendered outside the screen behind it, so a screen-level
 * KeyboardAvoidingView cannot protect an input inside the modal. This guard
 * catches the easy-to-repeat device-only failure where iOS covers the field the
 * operator is typing into.
 */
describe('cube modal keyboard avoidance', () => {
  it('makes every modal containing a text input own a keyboard avoider', () => {
    const cubeDirectory = path.resolve(__dirname, '..');
    const offenders = fs.readdirSync(cubeDirectory)
      .filter((name) => name.endsWith('.js'))
      .filter((name) => {
        const source = fs.readFileSync(path.join(cubeDirectory, name), 'utf8');
        return source.includes('<Modal')
          && source.includes('<TextInput')
          && !source.includes('<KeyboardAvoidingView');
      });

    expect(offenders).toEqual([]);
  });
});
