import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseYaml, stringifyYaml } from './yaml.js';

const formatterCommand = fileURLToPath(new URL('../../bin/datacontract-editor.js', import.meta.url));

function formatWithCommand(input, args = []) {
  return spawnSync(process.execPath, [formatterCommand, 'format-yaml', ...args], {
    encoding: 'utf8',
    input,
  });
}

describe('datacontract-editor format-yaml', () => {
  const cases = {
    'typed scalars': 'enabled: true\ncount: 42\nratio: 1.5\nempty: null\n',
    'scalar-like string keys': '"true": string key\n"42": another string key\n',
    Unicode: 'greeting: "Grüezi 👋"\n',
    'control characters': 'value: "before\\u0001after"\n',
    sequences: 'items:\n  - name: first\n    tags: [one, two]\n  - name: second\n',
    'long strings': `description: "${'a'.repeat(240)}"\n`,
    'multiline strings': 'description: "first line\\nsecond line"\n',
    'trailing whitespace': 'description: "first line\\nsecond line "\n',
    'missing final newline': 'name: example',
  };

  it.each(Object.entries(cases))('%s matches direct parser and serializer output', (_name, input) => {
    const result = formatWithCommand(input);
    const expected = stringifyYaml(parseYaml(input));

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(expected);
    expect(result.stdout.endsWith('\n')).toBe(true);
    expect(parseYaml(result.stdout)).toEqual(parseYaml(input));
    expect(formatWithCommand(result.stdout).stdout).toBe(result.stdout);
  });

  it('writes no YAML and returns a static diagnostic for invalid input', () => {
    const result = formatWithCommand('name: [unterminated\n');

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Error: unable to format YAML\n');
  });

  it.each([[], ['--help'], ['extra']])('rejects empty input and arguments %j', (args) => {
    const result = formatWithCommand('', args);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Error: unable to format YAML\n');
  });

  it.each([['--help'], ['extra']])('rejects trailing arguments %j', (args) => {
    const result = formatWithCommand('name: example\n', args);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Error: unable to format YAML\n');
  });
});
