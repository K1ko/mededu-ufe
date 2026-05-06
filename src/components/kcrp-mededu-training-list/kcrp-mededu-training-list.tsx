import { Component, Event, EventEmitter, Host, Prop, State, h } from '@stencil/core';

import { Configuration, DepartmentsApi, ResponseError, Training as ApiTraining, TrainingsApi } from '../../api/mededu';

import '@material/web/button/filled-button';
import '@material/web/button/filled-tonal-button';
import '@material/web/chips/assist-chip';
import '@material/web/icon/icon';
import '@material/web/list/list';
import '@material/web/list/list-item';
import '@material/web/progress/linear-progress';
import '@material/web/select/filled-select';
import '@material/web/select/select-option';
import '@material/web/textfield/filled-text-field';

type TrainingStatus = 'planned' | 'cancelled' | 'archived';
type CapacityFilter = '' | 'available' | 'full' | 'waitlisted';

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
  description?: string;
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
  @State() private searchFilter = '';
  @State() private departmentFilter = '';
  @State() private typeFilter = '';
  @State() private statusFilter: '' | TrainingStatus = '';
  @State() private capacityFilter: CapacityFilter = '';
  @State() private departments: string[] = sampleDepartments;
  @State() private loading = false;
  @State() private errorMessage = '';

  async componentWillLoad() {
    await Promise.all([
      this.loadTrainings(),
      this.loadDepartments(),
    ]);
  }

  render() {
    const visibleTrainings = this.filteredTrainings();
    const plannedTrainings = this.trainings.filter(training => training.status === 'planned').length;
    const freeSeats = this.trainings.reduce((sum, training) => sum + Math.max(training.capacity - training.occupied, 0), 0);
    const waitlisted = this.trainings.reduce((sum, training) => sum + training.waitlisted, 0);
    const registered = this.trainings.reduce((sum, training) => sum + training.occupied + training.waitlisted, 0);

    return (
      <Host>
        <header>
          <div>
            <h2>MedEdu školenia</h2>
            <p>Katalóg interného vzdelávania nemocničného personálu</p>
          </div>
          <div class="summary" aria-label="Prehľad katalógu">
            <span><strong>{plannedTrainings}</strong> plánované</span>
            <span><strong>{freeSeats}</strong> voľné miesta</span>
            <span><strong>{registered}</strong> registrácie</span>
            <span><strong>{waitlisted}</strong> náhradníci</span>
          </div>
          <md-filled-button href={this.createHref || undefined} onClick={() => this.createTraining()}>
            <md-icon slot="icon">add</md-icon>
            Nové školenie
          </md-filled-button>
        </header>

        <div class="toolbar">
          <md-filled-text-field
            label="Hľadať"
            value={this.searchFilter}
            onInput={(event: InputEvent) => this.searchFilter = this.eventValue(event)}>
            <md-icon slot="leading-icon">search</md-icon>
          </md-filled-text-field>

          <md-filled-select
            label="Oddelenie"
            value={this.departmentFilter}
            onInput={(event: InputEvent) => this.departmentFilter = this.eventValue(event)}>
            <md-icon slot="leading-icon">filter_alt</md-icon>
            <md-select-option value="">
              <div slot="headline">Všetky oddelenia</div>
            </md-select-option>
            {this.departments.map(department => (
              <md-select-option value={department} selected={department === this.departmentFilter}>
                <div slot="headline">{department}</div>
              </md-select-option>
            ))}
          </md-filled-select>

          <md-filled-select
            label="Typ"
            value={this.typeFilter}
            onInput={(event: InputEvent) => this.typeFilter = this.eventValue(event)}>
            <md-icon slot="leading-icon">category</md-icon>
            <md-select-option value="">
              <div slot="headline">Všetky typy</div>
            </md-select-option>
            {trainingTypeOptions.map(option => (
              <md-select-option value={option.value} selected={option.value === this.typeFilter}>
                <div slot="headline">{option.label}</div>
              </md-select-option>
            ))}
          </md-filled-select>

          <md-filled-select
            label="Stav"
            value={this.statusFilter}
            onInput={(event: InputEvent) => this.statusFilter = this.eventValue(event) as '' | TrainingStatus}>
            <md-icon slot="leading-icon">event_available</md-icon>
            <md-select-option value="">
              <div slot="headline">Všetky stavy</div>
            </md-select-option>
            <md-select-option value="planned" selected={this.statusFilter === 'planned'}>
              <div slot="headline">Plánované</div>
            </md-select-option>
            <md-select-option value="cancelled" selected={this.statusFilter === 'cancelled'}>
              <div slot="headline">Zrušené</div>
            </md-select-option>
            <md-select-option value="archived" selected={this.statusFilter === 'archived'}>
              <div slot="headline">Archivované</div>
            </md-select-option>
          </md-filled-select>

          <md-filled-select
            label="Kapacita"
            value={this.capacityFilter}
            onInput={(event: InputEvent) => this.capacityFilter = this.eventValue(event) as CapacityFilter}>
            <md-icon slot="leading-icon">groups</md-icon>
            <md-select-option value="">
              <div slot="headline">Všetko</div>
            </md-select-option>
            <md-select-option value="available" selected={this.capacityFilter === 'available'}>
              <div slot="headline">Voľné miesta</div>
            </md-select-option>
            <md-select-option value="full" selected={this.capacityFilter === 'full'}>
              <div slot="headline">Plné</div>
            </md-select-option>
            <md-select-option value="waitlisted" selected={this.capacityFilter === 'waitlisted'}>
              <div slot="headline">S náhradníkmi</div>
            </md-select-option>
          </md-filled-select>

          <div class="filter-actions">
            <md-filled-tonal-button onClick={() => this.resetFilters()} disabled={!this.hasActiveFilters()}>
              <md-icon slot="icon">filter_alt_off</md-icon>
              Zrušiť filtre
            </md-filled-tonal-button>
            <md-filled-tonal-button onClick={() => this.loadTrainings()}>
              <md-icon slot="icon">refresh</md-icon>
              Obnoviť
            </md-filled-tonal-button>
          </div>
        </div>

        <div class="result-count">{visibleTrainings.length} z {this.trainings.length} školení</div>

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
    const occupancy = Math.min(Math.round((training.occupied / training.capacity) * 100), 100);
    const isFull = training.occupied >= training.capacity;

    return (
      <md-list-item href={this.trainingHref(training.id) || undefined} onClick={() => this.openTraining(training.id)}>
        <md-icon slot="start">{training.onlineLink ? 'video_call' : 'school'}</md-icon>
        <div slot="headline">{training.title}</div>
        <div slot="supporting-text">
          <span class="department">{training.department}</span>
          <span>{this.trainingTypeLabel(training.type)}</span>
          <span>{startsAt.toLocaleString()}</span>
          <span>{place}</span>
          <span>lektor: {training.lecturer}</span>
        </div>
        <div slot="end" class="chips">
          <div class={{ occupancy: true, full: isFull }}>
            <span>{training.occupied}/{training.capacity}</span>
            <div class="meter" aria-label={`Obsadenosť ${occupancy} percent`}>
              <span style={{ width: `${occupancy}%` }}></span>
            </div>
          </div>
          <md-assist-chip label={isFull ? 'plné' : `${training.capacity - training.occupied} voľné`}>
            <md-icon slot="icon">groups</md-icon>
          </md-assist-chip>
          <md-assist-chip label={this.statusLabel(training.status)}>
            <md-icon slot="icon">{training.status === 'planned' ? 'event_available' : 'event_busy'}</md-icon>
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

      const trainings = await this.trainingsApi().listTrainings({});
      this.trainings = trainings.map(training => this.fromApiTraining(training));
    } catch (error: any) {
      this.trainings = sampleTrainings;
      this.errorMessage = `Nepodarilo sa načítať školenia z API: ${this.apiErrorMessage(error)}`;
    } finally {
      this.loading = false;
    }
  }

  private async loadDepartments() {
    try {
      if (!this.apiBase) {
        this.departments = sampleDepartments;
        return;
      }

      const departments = await this.departmentsApi().listDepartments();
      this.departments = departments.length > 0 ? departments : sampleDepartments;
    } catch {
      this.departments = sampleDepartments;
    }
  }

  private filteredTrainings(): Training[] {
    const search = this.normalize(this.searchFilter);
    const department = this.normalize(this.departmentFilter);
    const type = this.typeFilter.trim();
    const status = this.statusFilter.trim();
    const capacity = this.capacityFilter.trim();

    return this.trainings
      .filter(training => !search || this.trainingSearchText(training).includes(search))
      .filter(training => !department || this.normalize(training.department).includes(department))
      .filter(training => !type || training.type === type)
      .filter(training => !status || training.status === status)
      .filter(training => {
        if (capacity === 'available') {
          return training.status === 'planned' && training.occupied < training.capacity;
        }
        if (capacity === 'full') {
          return training.occupied >= training.capacity;
        }
        if (capacity === 'waitlisted') {
          return training.waitlisted > 0;
        }
        return true;
      })
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
  }

  private trainingSearchText(training: Training) {
    return this.normalize([
      training.title,
      training.department,
      this.trainingTypeLabel(training.type),
      this.statusLabel(training.status),
      training.lecturer,
      training.location || '',
      training.onlineLink || '',
      training.description || '',
      training.requirements || '',
    ].join(' '));
  }

  private normalize(value: string) {
    return value
      .toLocaleLowerCase('sk')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private resetFilters() {
    this.searchFilter = '';
    this.departmentFilter = '';
    this.typeFilter = '';
    this.statusFilter = '';
    this.capacityFilter = '';
  }

  private hasActiveFilters() {
    return Boolean(
      this.searchFilter ||
      this.departmentFilter ||
      this.typeFilter ||
      this.statusFilter ||
      this.capacityFilter,
    );
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

  private trainingsApi() {
    return new TrainingsApi(new Configuration({ basePath: this.apiBase.replace(/\/$/, '') }));
  }

  private departmentsApi() {
    return new DepartmentsApi(new Configuration({ basePath: this.apiBase.replace(/\/$/, '') }));
  }

  private fromApiTraining(training: ApiTraining): Training {
    const counts = this.registrationCounts(training.registrations);

    return {
      id: training.id,
      title: training.title,
      type: training.type,
      department: training.department,
      startAt: this.toIsoDate(training.startAt),
      capacity: Number(training.capacity || 1),
      lecturer: training.lecturer,
      location: training.location || '',
      onlineLink: training.onlineLink || '',
      description: training.description || '',
      requirements: training.requirements || '',
      status: (training.status || 'planned') as TrainingStatus,
      occupied: counts?.occupied ?? Number(training.occupied || 0),
      waitlisted: counts?.waitlisted ?? Number(training.waitlisted || 0),
    };
  }

  private registrationCounts(registrations: Array<{ status?: string }> | undefined) {
    if (!Array.isArray(registrations)) {
      return undefined;
    }

    return {
      occupied: registrations.filter(registration => registration.status === 'registered').length,
      waitlisted: registrations.filter(registration => registration.status === 'waitlisted').length,
    };
  }

  private trainingTypeLabel(type: string) {
    switch (type) {
      case 'mandatory':
        return 'Povinné';
      case 'department':
        return 'Oddelenie';
      case 'specialization':
        return 'Odbornosť';
      case 'online':
        return 'Online';
      default:
        return type;
    }
  }

  private statusLabel(status: TrainingStatus) {
    switch (status) {
      case 'cancelled':
        return 'zrušené';
      case 'archived':
        return 'archív';
      default:
        return 'plánované';
    }
  }

  private toIsoDate(value: Date | string | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }

  private apiErrorMessage(error: unknown): string {
    if (error instanceof ResponseError) {
      return `${error.response.status} ${error.response.statusText}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'neznáma chyba';
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
    occupied: 2,
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
    capacity: 2,
    occupied: 2,
    waitlisted: 2,
    lecturer: 'MUDr. Eva Hrubá',
    onlineLink: 'https://teams.example/mededu/icu-infection',
    requirements: 'Notebook alebo tablet',
    status: 'planned',
  },
  {
    id: 'pediatrics-onboarding-2026-06',
    title: 'Adaptačné školenie pre pediatriu',
    type: 'department',
    department: 'Pediatria',
    startAt: '2026-06-12T09:00:00Z',
    capacity: 12,
    occupied: 0,
    waitlisted: 0,
    lecturer: 'Mgr. Zuzana Farkašová',
    location: 'Pavilón D, miestnosť 2.14',
    requirements: 'Bez požiadaviek',
    status: 'planned',
  },
  {
    id: 'radiology-mri-2026-06',
    title: 'MR bezpečnosť a kontrastné látky',
    type: 'specialization',
    department: 'Radiológia',
    startAt: '2026-06-18T13:00:00Z',
    capacity: 8,
    occupied: 4,
    waitlisted: 0,
    lecturer: 'MUDr. Peter Oravec',
    location: 'Radiológia, seminárna miestnosť',
    requirements: 'Platné školenie BOZP',
    status: 'planned',
  },
  {
    id: 'anesthesia-airway-2026-06',
    title: 'Ťažká intubácia a krízové postupy',
    type: 'specialization',
    department: 'Anestéziológia',
    startAt: '2026-06-25T07:30:00Z',
    capacity: 3,
    occupied: 3,
    waitlisted: 0,
    lecturer: 'MUDr. Richard Urban',
    location: 'Simulačné centrum',
    requirements: 'Pracovné zaradenie na OAIM alebo urgentnom príjme',
    status: 'planned',
  },
  {
    id: 'surgery-teamwork-2026-07',
    title: 'Simulačný tréning perioperačnej komunikácie',
    type: 'department',
    department: 'Chirurgia',
    startAt: '2026-07-03T10:00:00Z',
    capacity: 10,
    occupied: 0,
    waitlisted: 0,
    lecturer: 'MUDr. Samuel Konečný',
    location: 'Operačný trakt, tréningová sála',
    requirements: 'Zaradenie v chirurgickom tíme',
    status: 'cancelled',
  },
  {
    id: 'gdpr-healthcare-2026-04',
    title: 'Ochrana osobných údajov v zdravotníctve',
    type: 'online',
    department: 'Interné',
    startAt: '2026-04-15T08:30:00Z',
    capacity: 15,
    occupied: 10,
    waitlisted: 0,
    lecturer: 'Mgr. Katarína Slámová',
    onlineLink: 'https://teams.example/mededu/gdpr-healthcare',
    requirements: 'Prístup do nemocničného e-learningu',
    status: 'archived',
  },
];

const trainingTypeOptions = [
  { value: 'mandatory', label: 'Povinné' },
  { value: 'department', label: 'Oddelenie' },
  { value: 'specialization', label: 'Odbornosť' },
  { value: 'online', label: 'Online' },
];

const sampleDepartments = [
  'Urgent',
  'JIS',
  'Chirurgia',
  'Interné',
  'Pediatria',
  'Radiológia',
  'Anestéziológia',
];
