import { Component, Host, Prop, State, h } from '@stencil/core';

import { registerNavigationApi } from '../../global/navigation';

type NavigateEventLike = Event & {
  canIntercept?: boolean;
  destination?: {
    url: string;
  };
  intercept?: () => void;
};

type NavigationApiLike = EventTarget & {
  navigate: (url: string) => unknown;
};

@Component({
  tag: 'kcrp-mededu-trainings-app',
  styleUrl: 'kcrp-mededu-trainings-app.css',
  shadow: true,
})
export class KcrpMededuTrainingsApp {
  @Prop({ attribute: 'base-path' }) basePath = '/kcrp-mededu-trainings/';
  @Prop({ attribute: 'api-base' }) apiBase = '';

  @State() private relativePath = '';

  private removeNavigationListener?: () => void;

  componentWillLoad() {
    registerNavigationApi();
    this.setRelativePath(window.location.href);

    const navigation = this.navigationApi();
    const onNavigate = (event: Event) => this.handleNavigate(event as NavigateEventLike);
    navigation.addEventListener('navigate', onNavigate);
    this.removeNavigationListener = () => navigation.removeEventListener('navigate', onNavigate);
  }

  disconnectedCallback() {
    this.removeNavigationListener?.();
  }

  render() {
    const route = this.relativePath.replace(/^\/+/, '');
    const editorMatch = route.match(/^training\/([^/]+)$/);

    return (
      <Host>
        {editorMatch ? this.renderEditor(editorMatch[1]) : this.renderList()}
      </Host>
    );
  }

  private renderList() {
    return (
      <kcrp-mededu-training-list
        apiBase={this.apiBase}
        createHref={this.pathInApplication('training/@new')}
        trainingHrefBase={this.pathInApplication('training')}
        onTraining-clicked={(event: CustomEvent<string>) => this.navigate(`training/${event.detail}`)}
        onTraining-create-clicked={() => this.navigate('training/@new')}
      ></kcrp-mededu-training-list>
    );
  }

  private renderEditor(trainingId: string) {
    return (
      <kcrp-mededu-training-editor
        trainingId={decodeURIComponent(trainingId)}
        apiBase={this.apiBase}
        backHref={this.pathInApplication('')}
        onTraining-cancelled={() => this.navigate('')}
        onTraining-saved={() => this.navigate('')}
        onTraining-archived={() => this.navigate('')}
      ></kcrp-mededu-training-editor>
    );
  }

  private handleNavigate(event: NavigateEventLike) {
    const targetUrl = event.destination?.url || window.location.href;

    if (!this.isApplicationUrl(targetUrl)) {
      return;
    }

    if (event.canIntercept !== false) {
      event.intercept?.();
    }

    this.setRelativePath(targetUrl);
  }

  private navigate(path: string) {
    this.navigationApi().navigate(this.pathInApplication(path));
  }

  private setRelativePath(url: string) {
    const pathname = new URL(url, window.location.href).pathname;
    const basePath = this.applicationBasePath();
    const basePathWithoutSlash = basePath.slice(0, -1);

    if (pathname === basePath || pathname === basePathWithoutSlash) {
      this.relativePath = '';
      return;
    }

    if (pathname.startsWith(basePath)) {
      this.relativePath = pathname.slice(basePath.length);
      return;
    }

    this.relativePath = '';
  }

  private isApplicationUrl(url: string) {
    const pathname = new URL(url, window.location.href).pathname;
    const basePath = this.applicationBasePath();
    return pathname === basePath.slice(0, -1) || pathname.startsWith(basePath);
  }

  private pathInApplication(path: string) {
    const cleanPath = path.replace(/^\/+/, '');
    return new URL(cleanPath, new URL(this.applicationBasePath(), window.location.origin)).pathname;
  }

  private applicationBasePath() {
    const basePath = new URL(this.basePath || '/', window.location.origin).pathname;
    return basePath.endsWith('/') ? basePath : `${basePath}/`;
  }

  private navigationApi(): NavigationApiLike {
    return (window as unknown as { navigation: NavigationApiLike }).navigation;
  }
}
