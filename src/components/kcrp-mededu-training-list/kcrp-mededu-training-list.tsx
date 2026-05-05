import { Component, Event, EventEmitter, Host, Prop, State, h } from '@stencil/core';

import '@material/web/button/filled-button';
import '@material/web/button/filled-tonal-button';
import '@material/web/chips/assist-chip';
import '@material/web/icon/icon';
import '@material/web/list/list';
import '@material/web/list/list-item';
import '@material/web/progress/linear-progress';
import '@material/web/textfield/filled-text-field';

type TrainingStatus = 'planned' | 'cancelled' | 'archived';

interface Training {
  id: string;
  title: string;
  type: string;
  department: string;
  startAt: string;
  capacity: number;
  lecturer: string;
  location?: string;
  onlineLink?: string;
  requirements?: string;
  status: TrainingStatus;
  occupied: number;
  waitlisted: number;
}

@Component({
  tag: 'kcrp-mededu-training-list',
  styleUrl: 'kcrp-mededu-training-list.css',
  shadow: true,
})
export class KcrpMededuTrainingList {
  @Prop() apiBase = '';
  @Prop() createHref = '';
  @Prop() trainingHrefBase = '';

  @Event({ eventName: 'training-clicked' }) trainingClicked: EventEmitter<string>;
  @Event({ eventName: 'training-create-clicked' }) trainingCreateClicked: EventEmitter<void>;

  @State() private trainings: Training[] = [];
  @State() private departmentFilter = '';
  @State() private loading = false;
  @State() private errorMessage = '';

  async componentWillLoad() {
    await this.loadTrainings();
  }

  render() {
    const visibleTrainings = this.filteredTrainings();

    return (
      <Host>
        <header>
          <div>
            <h2>MedEdu školenia</h2>
            <p>Katalóg interného vzdelávania nemocničného personálu</p>
          </div>
          <md-filled-button href={this.createHref || undefined} onClick={() => this.createTraining()}>
            <md-icon slot="icon">add</md-icon>
            Nové školenie
          </md-filled-button>
        </header>

        <div class="toolbar">
          <md-filled-text-field
            label="Filtrovať podľa oddelenia"
            value={this.departmentFilter}
            onInput={(event: InputEvent) => this.departmentFilter = this.eventValue(event)}>
            <md-icon slot="leading-icon">filter_alt</md-icon>
          </md-filled-text-field>

          <md-filled-tonal-button onClick={() => this.loadTrainings()}>
            <md-icon slot="icon">refresh</md-icon>
            Obnoviť
          </md-filled-tonal-button>
        </div>

        {this.loading ? <md-linear-progress indeterminate></md-linear-progress> : undefined}
        {this.errorMessage ? (
          <div class="error">
            <md-icon>error</md-icon>
            <span>{this.errorMessage}</span>
          </div>
        ) : undefined}

        {visibleTrainings.length === 0 ? (
          <div class="empty">Nenašli sa žiadne školenia pre zvolený filter.</div>
        ) : (
          <md-list>
            {visibleTrainings.map(training => this.renderTraining(training))}
          </md-list>
        )}
      </Host>
    );
  }

  private renderTraining(training: Training) {
    const startsAt = new Date(training.startAt);
    const place = training.location || training.onlineLink || 'miesto bude doplnené';

    return (
      <md-list-item href={this.trainingHref(training.id) || undefined} onClick={() => this.openTraining(training.id)}>
        <md-icon slot="start">{training.onlineLink ? 'video_call' : 'school'}</md-icon>
        <div slot="headline">{training.title}</div>
        <div slot="supporting-text">
          {training.department} · {startsAt.toLocaleString()} · {place} · lektor: {training.lecturer}
        </div>
        <div slot="end" class="chips">
          <md-assist-chip label={`${training.occupied}/${training.capacity} miest`}>
            <md-icon slot="icon">groups</md-icon>
          </md-assist-chip>
          {training.waitlisted > 0 ? (
            <md-assist-chip label={`${training.waitlisted} náhrad.`}>
              <md-icon slot="icon">pending</md-icon>
            </md-assist-chip>
          ) : undefined}
        </div>
      </md-list-item>
    );
  }

  private async loadTrainings() {
    this.loading = true;
    this.errorMessage = '';

    try {
      if (!this.apiBase) {
        this.trainings = sampleTrainings;
        return;
      }

      const response = await fetch(`${this.apiBase.replace(/\/$/, '')}/trainings`);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      this.trainings = await response.json();
    } catch (error: any) {
      this.trainings = sampleTrainings;
      this.errorMessage = `Nepodarilo sa načítať školenia z API: ${error.message || 'neznáma chyba'}`;
    } finally {
      this.loading = false;
    }
  }

  private filteredTrainings(): Training[] {
    const filter = this.departmentFilter.trim().toLowerCase();
    return this.trainings
      .filter(training => training.status !== 'archived')
      .filter(training => !filter || training.department.toLowerCase().includes(filter))
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
  }

  private eventValue(event: InputEvent): string {
    return (event.target as HTMLInputElement).value;
  }

  private createTraining() {
    if (!this.createHref) {
      this.trainingCreateClicked.emit();
    }
  }

  private openTraining(trainingId: string) {
    if (!this.trainingHrefBase) {
      this.trainingClicked.emit(trainingId);
    }
  }

  private trainingHref(trainingId: string) {
    if (!this.trainingHrefBase) {
      return '';
    }

    return `${this.trainingHrefBase.replace(/\/$/, '')}/${encodeURIComponent(trainingId)}`;
  }
}

const sampleTrainings: Training[] = [
  {
    id: 'urgent-safety-2026-05',
    title: 'BOZP pre urgentný príjem',
    type: 'mandatory',
    department: 'Urgent',
    startAt: '2026-05-20T08:00:00Z',
    capacity: 20,
    occupied: 16,
    waitlisted: 0,
    lecturer: 'Mgr. Jana Nováková',
    location: 'Školiaca miestnosť A',
    requirements: 'Zamestnanecký preukaz',
    status: 'planned',
  },
  {
    id: 'icu-infection-2026-06',
    title: 'Prevencia infekcií na JIS',
    type: 'department',
    department: 'JIS',
    startAt: '2026-06-02T12:30:00Z',
    capacity: 12,
    occupied: 12,
    waitlisted: 3,
    lecturer: 'MUDr. Eva Hrubá',
    onlineLink: 'https://teams.example/mededu/icu-infection',
    requirements: 'Notebook alebo tablet',
    status: 'planned',
  },
];
