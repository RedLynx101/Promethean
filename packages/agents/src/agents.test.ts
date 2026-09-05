import { afterEach, describe, expect, test, vi } from 'vitest';
import { createExampleWorkflow } from '@promethean/core';
import { SdkAgentExecutor, calculateCost, configuredModel, type UsageLedger } from './index.js';

afterEach(() => vi.unstubAllEnvs());
describe('bounded SDK configuration', () => {
  test('malformed local credentials fail before reserving money or contacting a provider', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'a synthetic malformed key with whitespace');
    vi.stubEnv('OPENAI_API_KEY_FILE', '');
    const ledger: UsageLedger = {
      reserve: vi.fn(() => 'reservation'),
      settle: vi.fn(),
      uncertain: vi.fn(),
    };
    const sdk = new SdkAgentExecutor(ledger, 'gpt-5.6-luna'),
      workflow = createExampleWorkflow('inbound-triage');
    await expect(sdk.execute(workflow.nodes[1], workflow.sampleInput, workflow)).rejects.toThrow(
      /valid server-side/,
    );
    expect(ledger.reserve).not.toHaveBeenCalled();
    expect(ledger.uncertain).not.toHaveBeenCalled();
  });
  test('unsupported models cannot silently replace the allowed budget models', () => {
    expect(configuredModel('gpt-5.6-luna')).toBe('gpt-5.6-luna');
    expect(configuredModel('gpt-5.6-terra')).toBe('gpt-5.6-terra');
    expect(() => configuredModel('another-model')).toThrow(/Only/);
  });
  test('the same measured token counts receive transparent model-specific costs', () => {
    expect(calculateCost('gpt-5.6-luna', 1000, 500)).toBeCloseTo(0.0008);
    expect(calculateCost('gpt-5.6-terra', 1000, 500)).toBeCloseTo(0.008);
    expect(calculateCost('gpt-5.6-luna', 1000, 0, 1000)).toBeCloseTo(0.00002);
    expect(calculateCost('gpt-5.6-luna', 1000, 0, 0, 1000)).toBeCloseTo(0.00025);
  });
});
