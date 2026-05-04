import { describe, expect, h, it, render } from '@stencil/vitest';

describe('kcrp-mededu-training-list', () => {
  it('renders MedEdu title and sample trainings', async () => {
    const { root } = await render(<kcrp-mededu-training-list></kcrp-mededu-training-list>);

    expect(root.shadowRoot.textContent).toContain('MedEdu školenia');
    expect(root.shadowRoot.textContent).toContain('BOZP pre urgentný príjem');
    expect(root.shadowRoot.textContent).toContain('Prevencia infekcií na JIS');
  });
});
