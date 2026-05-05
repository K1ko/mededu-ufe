import { describe, expect, h, it, render } from '@stencil/vitest';

describe('kcrp-mededu-training-editor', () => {
  it('renders MedEdu training editor fields', async () => {
    const { root } = await render(<kcrp-mededu-training-editor training-id="@new"></kcrp-mededu-training-editor>);
    const textFields = Array.from(root.shadowRoot.querySelectorAll('md-outlined-text-field'));
    const fieldLabels = textFields.map(field => (field as any).label);

    expect(root.shadowRoot.textContent).toContain('Nové školenie');
    expect(fieldLabels).toContain('Názov školenia');
    expect(fieldLabels).toContain('Kapacita');
    expect(textFields.length).toBeGreaterThanOrEqual(8);
    expect(root.shadowRoot.querySelectorAll('md-outlined-select').length).toBe(3);
    expect(root.shadowRoot.querySelectorAll('md-filled-button').length).toBe(1);
  });
});
