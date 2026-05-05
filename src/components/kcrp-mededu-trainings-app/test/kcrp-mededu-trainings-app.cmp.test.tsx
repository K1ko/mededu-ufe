import { describe, expect, h, it, render } from '@stencil/vitest';

describe('kcrp-mededu-trainings-app', () => {
  it('renders list route without trailing slash', async () => {
    window.history.pushState(null, '', '/kcrp-mededu-trainings');
    window.dispatchEvent(new PopStateEvent('popstate'));

    const { root } = await render(<kcrp-mededu-trainings-app base-path="/kcrp-mededu-trainings/"></kcrp-mededu-trainings-app>);

    expect(root.shadowRoot.querySelector('kcrp-mededu-training-list')).not.toBeNull();
    expect(root.shadowRoot.querySelector('kcrp-mededu-training-editor')).toBeNull();
  });

  it('renders list route', async () => {
    window.history.pushState(null, '', '/kcrp-mededu-trainings/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    const { root } = await render(<kcrp-mededu-trainings-app base-path="/kcrp-mededu-trainings/"></kcrp-mededu-trainings-app>);

    expect(root.shadowRoot.querySelector('kcrp-mededu-training-list')).not.toBeNull();
    expect(root.shadowRoot.querySelector('kcrp-mededu-training-editor')).toBeNull();
  });

  it('renders editor route', async () => {
    window.history.pushState(null, '', '/kcrp-mededu-trainings/training/@new');
    window.dispatchEvent(new PopStateEvent('popstate'));

    const { root } = await render(<kcrp-mededu-trainings-app base-path="/kcrp-mededu-trainings/"></kcrp-mededu-trainings-app>);

    expect(root.shadowRoot.querySelector('kcrp-mededu-training-editor')).not.toBeNull();
    expect(root.shadowRoot.querySelector('kcrp-mededu-training-list')).toBeNull();
  });

  it('uses Navigation API to switch from list to editor', async () => {
    window.history.pushState(null, '', '/kcrp-mededu-trainings/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    const { root, waitForChanges } = await render(<kcrp-mededu-trainings-app base-path="/kcrp-mededu-trainings/"></kcrp-mededu-trainings-app>);

    (window as unknown as { navigation: { navigate: (url: string) => void } }).navigation.navigate('/kcrp-mededu-trainings/training/urgent-safety-2026-05');
    await waitForChanges();

    const editor = root.shadowRoot.querySelector('kcrp-mededu-training-editor');
    expect(editor).not.toBeNull();
    expect(editor.trainingId).toBe('urgent-safety-2026-05');
    expect(root.shadowRoot.querySelector('kcrp-mededu-training-list')).toBeNull();
  });
});
