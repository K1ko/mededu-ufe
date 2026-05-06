import { Component, Event as StencilEvent, EventEmitter, Host, Prop, State, h } from '@stencil/core';

import {
  Configuration,
  DepartmentsApi,
  Registration as ApiRegistration,
  RegistrationInput,
  RegistrationsApi,
  ResponseError,
  Training as ApiTraining,
  TrainingInput,
  TrainingStatus as ApiTrainingStatus,
  TrainingType as ApiTrainingType,
  TrainingsApi,
} from '../../api/mededu';

import '@material/web/button/filled-button';
import '@material/web/button/filled-tonal-button';
import '@material/web/button/outlined-button';
import '@material/web/icon/icon';
import '@material/web/progress/linear-progress';
import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import '@material/web/textfield/outlined-text-field';

export type TrainingStatus = 'planned' | 'cancelled' | 'archived';
export type RegistrationStatus = 'registered' | 'waitlisted';
type UserRole = 'employee' | 'hr';

export interface TrainingForm {
  id?: string;
  title: string;
  type: string;
  department: string;
  startAt: string;
  capacity: number;
  lecturer: string;
  location: string;
  onlineLink: string;
  description: string;
  requirements: string;
  status: TrainingStatus;
  occupied: number;
  waitlisted: number;
}

interface Registration {
  id: string;
  trainingId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  note: string;
  status: RegistrationStatus;
  registeredAt: string;
}

interface RegistrationForm {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  note: string;
  targetTrainingId: string;
}

interface TrainingOption {
  id: string;
  title: string;
  startAt: string;
  department: string;
  status: TrainingStatus;
}

@Component({
  tag: 'kcrp-mededu-training-editor',
  styleUrl: 'kcrp-mededu-training-editor.css',
  shadow: true,
})
export class KcrpMededuTrainingEditor {
  @Prop({ attribute: 'training-id' }) trainingId = '@new';
  @Prop() apiBase = '';
  @Prop() backHref = '';

  @StencilEvent({ eventName: 'training-saved' }) trainingSaved: EventEmitter<TrainingForm>;
  @StencilEvent({ eventName: 'training-cancelled' }) trainingCancelled: EventEmitter<void>;
  @StencilEvent({ eventName: 'training-archived' }) trainingArchived: EventEmitter<string>;
  @StencilEvent({ eventName: 'training-deleted' }) trainingDeleted: EventEmitter<string>;

  @State() private form: TrainingForm = this.emptyTraining();
  @State() private loading = false;
  @State() private errorMessage = '';
  @State() private savedMessage = '';
  @State() private departments: string[] = sampleDepartments;
  @State() private registrations: Registration[] = [];
  @State() private registrationForm: RegistrationForm = this.emptyRegistration();
  @State() private registrationMessage = '';
  @State() private editingRegistrationId = '';
  @State() private trainingOptions: TrainingOption[] = [];
  @State() private activeRole: UserRole = 'employee';

  async componentWillLoad() {
    await Promise.all([
      this.loadTraining(),
      this.loadDepartments(),
      this.loadRegistrations(),
      this.loadTrainingOptions(),
    ]);
  }

  render() {
    const isNew = this.trainingId === '@new';

    return (
      <Host>
        <header>
          <div>
            <h2>{isNew ? 'Nové školenie' : 'Úprava školenia'}</h2>
            <p>{isNew ? 'Vytvorenie položky v katalógu interného vzdelávania' : 'Aktualizácia termínu, kapacity a organizačných údajov'}</p>
          </div>
          <span>{isNew ? 'Nový záznam' : this.form.status}</span>
        </header>

        {this.loading ? <md-linear-progress indeterminate></md-linear-progress> : undefined}

        {this.errorMessage ? (
          <div class="message error">
            <md-icon>error</md-icon>
            <span>{this.errorMessage}</span>
          </div>
        ) : undefined}

        {this.savedMessage ? (
          <div class="message success">
            <md-icon>check_circle</md-icon>
            <span>{this.savedMessage}</span>
          </div>
        ) : undefined}

        <form onSubmit={(event) => this.saveTraining(event)}>
          <section class="form-section">
            <h3>Základné údaje</h3>
            <div class="grid">
            <md-outlined-text-field
              required
              label="Názov školenia"
              value={this.form.title}
              onInput={(event: InputEvent) => this.updateField('title', this.eventValue(event))}>
              <md-icon slot="leading-icon">school</md-icon>
            </md-outlined-text-field>

            <md-outlined-select
              required
              label="Typ školenia"
              value={this.form.type}
              onInput={(event: InputEvent) => this.updateField('type', this.eventValue(event))}>
              <md-select-option value="mandatory">
                <div slot="headline">Povinné</div>
              </md-select-option>
              <md-select-option value="department">
                <div slot="headline">Oddelenie</div>
              </md-select-option>
              <md-select-option value="specialization">
                <div slot="headline">Odbornosť</div>
              </md-select-option>
              <md-select-option value="online">
                <div slot="headline">Online</div>
              </md-select-option>
            </md-outlined-select>

            {this.renderDepartmentField()}
            </div>
          </section>

          <section class="form-section">
            <h3>Termín a organizácia</h3>
            <div class="grid">
            <md-outlined-text-field
              required
              type="datetime-local"
              label="Termín školenia"
              value={this.form.startAt}
              onInput={(event: InputEvent) => this.updateField('startAt', this.eventValue(event))}>
              <md-icon slot="leading-icon">event</md-icon>
            </md-outlined-text-field>

            <md-outlined-text-field
              required
              min="1"
              type="number"
              label="Kapacita"
              value={String(this.form.capacity)}
              onInput={(event: InputEvent) => this.updateField('capacity', Number(this.eventValue(event)))}>
              <md-icon slot="leading-icon">groups</md-icon>
            </md-outlined-text-field>

            <md-outlined-text-field
              required
              label="Lektor"
              value={this.form.lecturer}
              onInput={(event: InputEvent) => this.updateField('lecturer', this.eventValue(event))}>
              <md-icon slot="leading-icon">person</md-icon>
            </md-outlined-text-field>

            <md-outlined-text-field
              label="Miesto"
              value={this.form.location}
              onInput={(event: InputEvent) => this.updateField('location', this.eventValue(event))}>
              <md-icon slot="leading-icon">meeting_room</md-icon>
            </md-outlined-text-field>

            <md-outlined-text-field
              label="Online link"
              value={this.form.onlineLink}
              onInput={(event: InputEvent) => this.updateField('onlineLink', this.eventValue(event))}>
              <md-icon slot="leading-icon">video_call</md-icon>
            </md-outlined-text-field>
            </div>
          </section>

          <section class="form-section">
            <h3>Stav a požiadavky</h3>
            <div class="grid single">
            <md-outlined-select
              label="Stav"
              value={this.form.status}
              onInput={(event: InputEvent) => this.updateField('status', this.eventValue(event) as TrainingStatus)}>
              <md-select-option value="planned">
                <div slot="headline">Plánované</div>
              </md-select-option>
              <md-select-option value="cancelled">
                <div slot="headline">Zrušené</div>
              </md-select-option>
              <md-select-option value="archived">
                <div slot="headline">Archivované</div>
              </md-select-option>
            </md-outlined-select>
            </div>

          <md-outlined-text-field
            class="wide"
            type="textarea"
            rows="3"
            label="Popis"
            value={this.form.description}
            onInput={(event: InputEvent) => this.updateField('description', this.eventValue(event))}>
          </md-outlined-text-field>

          <md-outlined-text-field
            class="wide"
            type="textarea"
            rows="3"
            label="Požiadavky"
            value={this.form.requirements}
            onInput={(event: InputEvent) => this.updateField('requirements', this.eventValue(event))}>
          </md-outlined-text-field>
          </section>

          <div class="actions">
            {!isNew ? (
              <md-filled-tonal-button type="button" onClick={() => this.deleteTraining()}>
                <md-icon slot="icon">delete</md-icon>
                Odstrániť
              </md-filled-tonal-button>
            ) : undefined}
            {!isNew ? (
              <md-outlined-button type="button" onClick={() => this.archiveTraining()}>
                <md-icon slot="icon">archive</md-icon>
                Archivovať
              </md-outlined-button>
            ) : undefined}
            <span class="stretch-fill"></span>
            <md-outlined-button type="button" href={this.backHref || undefined} onClick={() => this.cancelTraining()}>
              Späť
            </md-outlined-button>
            <md-filled-button type="submit">
              <md-icon slot="icon">save</md-icon>
              Uložiť
            </md-filled-button>
          </div>
        </form>

        {!isNew ? this.renderRegistrationsSection() : undefined}
      </Host>
    );
  }

  private renderRegistrationsSection() {
    const occupancy = Math.min(Math.round((this.form.occupied / Math.max(this.form.capacity, 1)) * 100), 100);
    const availableSeats = Math.max(this.form.capacity - this.form.occupied, 0);
    const isHrMode = this.activeRole === 'hr';

    return (
      <section class={{ 'registration-panel': true, 'hr-mode': isHrMode }}>
        <div class="registration-header">
          <div>
            <h3>Registrácie</h3>
            <p>{isHrMode ? 'HR prehľad účastníkov, náhradníkov a presuny termínov' : 'Prihlásenie alebo úprava vlastnej registrácie na školenie'}</p>
          </div>
          <div class="role-switch" aria-label="Režim práce s registráciami">
            <button
              type="button"
              class={{ active: this.activeRole === 'employee' }}
              onClick={() => this.setRole('employee')}>
              <md-icon>person</md-icon>
              Zamestnanec
            </button>
            <button
              type="button"
              class={{ active: isHrMode }}
              onClick={() => this.setRole('hr')}>
              <md-icon>admin_panel_settings</md-icon>
              HR
            </button>
          </div>
          <div class="capacity-summary" aria-label="Obsadenosť školenia">
            <strong>{this.form.occupied}/{this.form.capacity}</strong>
            <span>{availableSeats > 0 ? `${availableSeats} voľné miesta` : 'kapacita naplnená'}</span>
            <div class="capacity-meter">
              <span style={{ width: `${occupancy}%` }}></span>
            </div>
          </div>
        </div>

        {this.registrationMessage ? (
          <div class="message success">
            <md-icon>check_circle</md-icon>
            <span>{this.registrationMessage}</span>
          </div>
        ) : undefined}

        <form class="registration-form" onSubmit={(event) => this.saveRegistration(event)}>
          <h4>{isHrMode ? (this.editingRegistrationId ? 'Úprava účastníka' : 'Pridanie účastníka') : (this.editingRegistrationId ? 'Úprava mojej registrácie' : 'Moja registrácia')}</h4>
          <div class="grid">
            <md-outlined-text-field
              required
              label="ID zamestnanca"
              value={this.registrationForm.employeeId}
              onInput={(event: InputEvent) => this.updateRegistrationField('employeeId', this.eventValue(event))}>
              <md-icon slot="leading-icon">badge</md-icon>
            </md-outlined-text-field>

            <md-outlined-text-field
              required
              label="Meno zamestnanca"
              value={this.registrationForm.employeeName}
              onInput={(event: InputEvent) => this.updateRegistrationField('employeeName', this.eventValue(event))}>
              <md-icon slot="leading-icon">person</md-icon>
            </md-outlined-text-field>

            <md-outlined-text-field
              label="E-mail"
              value={this.registrationForm.employeeEmail}
              onInput={(event: InputEvent) => this.updateRegistrationField('employeeEmail', this.eventValue(event))}>
              <md-icon slot="leading-icon">mail</md-icon>
            </md-outlined-text-field>

            {this.renderRegistrationDepartmentField()}
          </div>

          {this.editingRegistrationId ? this.renderRegistrationMoveField() : undefined}

          <md-outlined-text-field
            class="wide"
            type="textarea"
            rows="2"
            label="Poznámka"
            value={this.registrationForm.note}
            onInput={(event: InputEvent) => this.updateRegistrationField('note', this.eventValue(event))}>
          </md-outlined-text-field>

          <div class="registration-actions">
            {this.editingRegistrationId ? (
              <md-outlined-button type="button" onClick={() => this.cancelRegistrationEdit()}>
                Zrušiť úpravu
              </md-outlined-button>
            ) : undefined}
            <span class="stretch-fill"></span>
            <md-filled-button type="submit">
              <md-icon slot="icon">{this.editingRegistrationId ? 'save' : 'how_to_reg'}</md-icon>
              {this.editingRegistrationId ? 'Uložiť registráciu' : (isHrMode ? 'Pridať účastníka' : 'Prihlásiť sa')}
            </md-filled-button>
          </div>
        </form>

        <div class="participants-header">
          <h4>{isHrMode ? 'Účastníci školenia' : 'Obsadenosť a poradie'}</h4>
          <span>{this.registrations.length} spolu</span>
        </div>
        <div class="participants" aria-label="Zoznam účastníkov školenia">
          {this.registrations.length === 0 ? (
            <div class="empty">Zatiaľ nie je prihlásený žiadny účastník.</div>
          ) : this.registrations.map(registration => this.renderRegistration(registration))}
        </div>
      </section>
    );
  }

  private renderRegistrationDepartmentField() {
    return (
      <md-outlined-select
        label="Oddelenie"
        value={this.registrationForm.department}
        onInput={(event: InputEvent) => this.updateRegistrationField('department', this.eventValue(event))}>
        <md-icon slot="leading-icon">local_hospital</md-icon>
        <md-select-option value="">
          <div slot="headline">Bez oddelenia</div>
        </md-select-option>
        {this.departmentOptions().map(department => (
          <md-select-option value={department} selected={department === this.registrationForm.department}>
            <div slot="headline">{department}</div>
          </md-select-option>
        ))}
      </md-outlined-select>
    );
  }

  private renderRegistrationMoveField() {
    const options = this.trainingOptions
      .filter(training => training.id !== this.trainingId && training.status === 'planned');

    if (options.length === 0) {
      return undefined;
    }

    return (
      <div class="grid single move-field">
        <md-outlined-select
          label="Presunúť na iný termín"
          value={this.registrationForm.targetTrainingId}
          onInput={(event: InputEvent) => this.updateRegistrationField('targetTrainingId', this.eventValue(event))}>
          <md-select-option value="">
            <div slot="headline">Ponechať na tomto školení</div>
          </md-select-option>
          {options.map(training => (
            <md-select-option value={training.id} selected={training.id === this.registrationForm.targetTrainingId}>
              <div slot="headline">{training.title}</div>
              <div slot="supporting-text">{this.formatDateTime(training.startAt)} / {training.department}</div>
            </md-select-option>
          ))}
        </md-outlined-select>
      </div>
    );
  }

  private renderRegistration(registration: Registration) {
    const isHrMode = this.activeRole === 'hr';

    return (
      <article class={{ participant: true, waitlisted: registration.status === 'waitlisted', compact: !isHrMode }}>
        <div>
          <strong>{registration.employeeName}</strong>
          <span>{registration.employeeId}{registration.department ? ` / ${registration.department}` : ''}</span>
          {registration.note ? <small>{registration.note}</small> : undefined}
        </div>
        <span class="status-chip">{this.registrationStatusLabel(registration.status)}</span>
        {isHrMode ? (
          <div class="participant-actions">
            <md-outlined-button type="button" onClick={() => this.editRegistration(registration)}>
              <md-icon slot="icon">edit</md-icon>
              Upraviť
            </md-outlined-button>
            <md-filled-tonal-button type="button" onClick={() => this.deleteRegistration(registration)}>
              <md-icon slot="icon">person_remove</md-icon>
              Odhlásiť
            </md-filled-tonal-button>
          </div>
        ) : undefined}
      </article>
    );
  }

  private async loadTraining() {
    this.errorMessage = '';
    this.savedMessage = '';

    if (this.trainingId === '@new') {
      this.form = this.emptyTraining();
      return;
    }

    this.loading = true;
    try {
      if (!this.apiBase) {
        this.form = sampleTraining(this.trainingId);
        return;
      }

      this.form = this.fromApiTraining(await this.trainingsApi().getTraining({ trainingId: this.trainingId }));
    } catch (error: any) {
      this.form = sampleTraining(this.trainingId);
      this.errorMessage = `Nepodarilo sa načítať školenie z API: ${this.apiErrorMessage(error)}`;
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

  private async loadRegistrations() {
    if (this.trainingId === '@new') {
      this.registrations = [];
      return;
    }

    try {
      if (!this.apiBase) {
        this.registrations = sampleRegistrations(this.trainingId);
        this.syncFormCountsFromRegistrations();
        return;
      }

      this.registrations = await this.listRegistrationsSafe();
      this.syncFormCountsFromRegistrations();
    } catch (error: any) {
      this.registrations = sampleRegistrations(this.trainingId);
      this.syncFormCountsFromRegistrations();
      this.errorMessage = `Nepodarilo sa načítať registrácie z API: ${this.apiErrorMessage(error)}`;
    }
  }

  private async loadTrainingOptions() {
    try {
      if (!this.apiBase) {
        this.trainingOptions = sampleTrainingOptions;
        return;
      }

      const trainings = await this.trainingsApi().listTrainings({});
      this.trainingOptions = trainings.map(training => ({
        id: training.id,
        title: training.title,
        startAt: this.toIsoDate(training.startAt),
        department: training.department,
        status: (training.status || 'planned') as TrainingStatus,
      }));
    } catch {
      this.trainingOptions = sampleTrainingOptions;
    }
  }

  private renderDepartmentField() {
    return (
      <md-outlined-select
        required
        label="Oddelenie / odbornosť"
        value={this.form.department}
        onInput={(event: InputEvent) => this.updateField('department', this.eventValue(event))}>
        <md-icon slot="leading-icon">local_hospital</md-icon>
        {this.departmentOptions().map(department => (
          <md-select-option value={department} selected={department === this.form.department}>
            <div slot="headline">{department}</div>
          </md-select-option>
        ))}
      </md-outlined-select>
    );
  }

  private async saveTraining(event: Event) {
    event.preventDefault();
    this.errorMessage = '';
    this.savedMessage = '';

    if (!this.form.location.trim() && !this.form.onlineLink.trim()) {
      this.errorMessage = 'Vyplňte miesto alebo online link školenia.';
      return;
    }

    if (this.form.capacity < 1) {
      this.errorMessage = 'Kapacita musí byť aspoň 1.';
      return;
    }

    this.loading = true;
    try {
      const payload = this.toApiTrainingInput();
      let savedTraining: ApiTraining | undefined;

      if (this.apiBase) {
        const isNew = this.trainingId === '@new';
        savedTraining = isNew
          ? await this.trainingsApi().createTraining({ trainingInput: payload })
          : await this.trainingsApi().updateTraining({ trainingId: this.trainingId, trainingInput: payload });
      }

      if (savedTraining) {
        this.form = this.fromApiTraining(savedTraining);
      }

      this.savedMessage = 'Školenie bolo uložené.';
      this.trainingSaved.emit(this.form);
    } catch (error: any) {
      this.errorMessage = `Nepodarilo sa uložiť školenie: ${this.apiErrorMessage(error)}`;
    } finally {
      this.loading = false;
    }
  }

  private async archiveTraining() {
    this.form = { ...this.form, status: 'archived' };
    await this.saveTraining(new Event('submit'));
    this.trainingArchived.emit(this.trainingId);
  }

  private async deleteTraining() {
    this.errorMessage = '';
    this.savedMessage = '';

    if (this.trainingId === '@new') {
      return;
    }

    if (!window.confirm('Naozaj odstrániť školenie?')) {
      return;
    }

    this.loading = true;
    try {
      if (this.apiBase) {
        await this.trainingsApi().deleteTraining({ trainingId: this.trainingId });
      }

      this.trainingDeleted.emit(this.trainingId);
    } catch (error: any) {
      this.errorMessage = `Nepodarilo sa odstrániť školenie: ${this.apiErrorMessage(error)}`;
    } finally {
      this.loading = false;
    }
  }

  private async saveRegistration(event: Event) {
    event.preventDefault();
    this.errorMessage = '';
    this.registrationMessage = '';

    if (!this.registrationForm.employeeId.trim() || !this.registrationForm.employeeName.trim()) {
      this.errorMessage = 'Vyplňte ID a meno zamestnanca.';
      return;
    }

    this.loading = true;
    try {
      let savedRegistration: Registration | undefined;
      const payload = this.toApiRegistrationInput();

      if (this.apiBase) {
        const apiRegistration = this.editingRegistrationId
          ? await this.registrationsApi().updateRegistration({
            trainingId: this.trainingId,
            registrationId: this.editingRegistrationId,
            registrationInput: payload,
          })
          : await this.registrationsApi().createRegistration({
            trainingId: this.trainingId,
            registrationInput: payload,
          });
        savedRegistration = this.fromApiRegistration(apiRegistration);
      } else {
        savedRegistration = this.saveSampleRegistration();
      }

      if (this.apiBase) {
        await Promise.all([
          this.loadTraining(),
          this.loadRegistrations(),
          this.loadTrainingOptions(),
        ]);
      }
      this.registrationForm = this.emptyRegistration();
      this.editingRegistrationId = '';
      this.registrationMessage = savedRegistration?.status === 'waitlisted'
        ? 'Registrácia bola uložená ako náhradník.'
        : 'Registrácia bola uložená.';
    } catch (error: any) {
      this.errorMessage = `Nepodarilo sa uložiť registráciu: ${this.apiErrorMessage(error)}`;
    } finally {
      this.loading = false;
    }
  }

  private editRegistration(registration: Registration) {
    this.editingRegistrationId = registration.id;
    this.registrationForm = {
      employeeId: registration.employeeId,
      employeeName: registration.employeeName,
      employeeEmail: registration.employeeEmail,
      department: registration.department,
      note: registration.note,
      targetTrainingId: '',
    };
    this.registrationMessage = '';
  }

  private cancelRegistrationEdit() {
    this.editingRegistrationId = '';
    this.registrationForm = this.emptyRegistration();
    this.registrationMessage = '';
  }

  private setRole(role: UserRole) {
    this.activeRole = role;
    this.cancelRegistrationEdit();
  }

  private async deleteRegistration(registration: Registration) {
    this.errorMessage = '';
    this.registrationMessage = '';

    if (!window.confirm(`Odhlásiť účastníka ${registration.employeeName}?`)) {
      return;
    }

    this.loading = true;
    try {
      if (this.apiBase) {
        await this.registrationsApi().deleteRegistration({
          trainingId: this.trainingId,
          registrationId: registration.id,
        });
      } else {
        this.registrations = this.recalculateRegistrationStatuses(
          this.registrations.filter(item => item.id !== registration.id),
        );
        this.form = {
          ...this.form,
          occupied: this.registrations.filter(item => item.status === 'registered').length,
          waitlisted: this.registrations.filter(item => item.status === 'waitlisted').length,
        };
      }

      if (this.apiBase) {
        await Promise.all([
          this.loadTraining(),
          this.loadRegistrations(),
        ]);
      }
      this.cancelRegistrationEdit();
      this.registrationMessage = 'Registrácia bola odstránená.';
    } catch (error: any) {
      this.errorMessage = `Nepodarilo sa odstrániť registráciu: ${this.apiErrorMessage(error)}`;
    } finally {
      this.loading = false;
    }
  }

  private updateField<Field extends keyof TrainingForm>(field: Field, value: TrainingForm[Field]) {
    this.form = { ...this.form, [field]: value };
    this.savedMessage = '';
  }

  private updateRegistrationField<Field extends keyof RegistrationForm>(field: Field, value: RegistrationForm[Field]) {
    this.registrationForm = { ...this.registrationForm, [field]: value };
    this.registrationMessage = '';
  }

  private eventValue(event: InputEvent): string {
    return (event.target as HTMLInputElement).value;
  }

  private cancelTraining() {
    if (!this.backHref) {
      this.trainingCancelled.emit();
    }
  }

  private emptyTraining(): TrainingForm {
    return {
      title: '',
      type: 'mandatory',
      department: '',
      startAt: '',
      capacity: 10,
      lecturer: '',
      location: '',
      onlineLink: '',
      description: '',
      requirements: '',
      status: 'planned',
      occupied: 0,
      waitlisted: 0,
    };
  }

  private emptyRegistration(): RegistrationForm {
    return {
      employeeId: '',
      employeeName: '',
      employeeEmail: '',
      department: '',
      note: '',
      targetTrainingId: '',
    };
  }

  private trainingsApi() {
    return new TrainingsApi(new Configuration({ basePath: this.apiBase.replace(/\/$/, '') }));
  }

  private registrationsApi() {
    return new RegistrationsApi(new Configuration({ basePath: this.apiBase.replace(/\/$/, '') }));
  }

  private departmentsApi() {
    return new DepartmentsApi(new Configuration({ basePath: this.apiBase.replace(/\/$/, '') }));
  }

  private async listRegistrationsSafe(): Promise<Registration[]> {
    const response = await fetch(`${this.apiBase.replace(/\/$/, '')}/trainings/${encodeURIComponent(this.trainingId)}/registrations`);
    if (!response.ok) {
      throw new ResponseError(response, 'Response returned an error code');
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload.map(registration => this.fromApiRegistration(registration as ApiRegistration));
  }

  private departmentOptions() {
    const currentDepartment = this.form.department.trim();

    if (currentDepartment && !this.departments.includes(currentDepartment)) {
      return [currentDepartment, ...this.departments];
    }

    return this.departments;
  }

  private fromApiTraining(training: ApiTraining): TrainingForm {
    const counts = this.registrationCounts(training.registrations);

    return {
      id: training.id,
      title: training.title || '',
      type: training.type || 'mandatory',
      department: training.department || '',
      startAt: this.toDatetimeLocal(training.startAt || ''),
      capacity: Number(training.capacity || 1),
      lecturer: training.lecturer || '',
      location: training.location || '',
      onlineLink: training.onlineLink || '',
      description: training.description || '',
      requirements: training.requirements || '',
      status: (training.status || 'planned') as TrainingStatus,
      occupied: counts?.occupied ?? Number(training.occupied || 0),
      waitlisted: counts?.waitlisted ?? Number(training.waitlisted || 0),
    };
  }

  private fromApiRegistration(registration: ApiRegistration): Registration {
    return {
      id: registration.id,
      trainingId: registration.trainingId,
      employeeId: registration.employeeId,
      employeeName: registration.employeeName,
      employeeEmail: registration.employeeEmail || '',
      department: registration.department || '',
      note: registration.note || '',
      status: (registration.status || 'registered') as RegistrationStatus,
      registeredAt: this.toIsoDate(registration.registeredAt),
    };
  }

  private toApiTrainingInput(): TrainingInput {
    return {
      title: this.form.title,
      type: this.form.type as ApiTrainingType,
      department: this.form.department,
      startAt: this.form.startAt ? new Date(this.form.startAt) : new Date(),
      capacity: this.form.capacity,
      lecturer: this.form.lecturer,
      location: this.form.location,
      onlineLink: this.form.onlineLink,
      description: this.form.description,
      requirements: this.form.requirements,
      status: this.form.status as ApiTrainingStatus,
    };
  }

  private toApiRegistrationInput(): RegistrationInput {
    return {
      employeeId: this.registrationForm.employeeId,
      employeeName: this.registrationForm.employeeName,
      employeeEmail: this.registrationForm.employeeEmail || undefined,
      department: this.registrationForm.department || undefined,
      note: this.registrationForm.note || undefined,
      targetTrainingId: this.registrationForm.targetTrainingId || undefined,
    };
  }

  private saveSampleRegistration(): Registration {
    const existing = this.editingRegistrationId
      ? this.registrations.find(registration => registration.id === this.editingRegistrationId)
      : undefined;
    const registration: Registration = {
      id: existing?.id || `local-${Date.now()}`,
      trainingId: this.registrationForm.targetTrainingId || this.trainingId,
      employeeId: this.registrationForm.employeeId,
      employeeName: this.registrationForm.employeeName,
      employeeEmail: this.registrationForm.employeeEmail,
      department: this.registrationForm.department,
      note: this.registrationForm.note,
      status: 'registered',
      registeredAt: existing?.registeredAt || new Date().toISOString(),
    };

    const nextRegistrations = existing
      ? this.registrations.map(item => item.id === existing.id ? registration : item)
      : [...this.registrations, registration];

    this.registrations = this.recalculateRegistrationStatuses(nextRegistrations);
    this.form = {
      ...this.form,
      occupied: this.registrations.filter(item => item.status === 'registered').length,
      waitlisted: this.registrations.filter(item => item.status === 'waitlisted').length,
    };
    return this.registrations.find(item => item.id === registration.id) || registration;
  }

  private recalculateRegistrationStatuses(registrations: Registration[]) {
    return [...registrations]
      .sort((left, right) => new Date(left.registeredAt).getTime() - new Date(right.registeredAt).getTime())
      .map((registration, index) => ({
        ...registration,
        trainingId: this.trainingId,
        status: index < this.form.capacity ? 'registered' as RegistrationStatus : 'waitlisted' as RegistrationStatus,
      }));
  }

  private syncFormCountsFromRegistrations() {
    const counts = this.registrationCounts(this.registrations) || { occupied: 0, waitlisted: 0 };
    this.form = {
      ...this.form,
      occupied: counts.occupied,
      waitlisted: counts.waitlisted,
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

  private toDatetimeLocal(value: Date | string): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  private toIsoDate(value: Date | string | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }

  private formatDateTime(value: Date | string | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  private registrationStatusLabel(status: RegistrationStatus) {
    return status === 'waitlisted' ? 'Náhradník' : 'Prihlásený';
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

function sampleTraining(id: string): TrainingForm {
  return {
    id,
    title: 'BOZP pre urgentný príjem',
    type: 'mandatory',
    department: 'Urgent',
    startAt: '2026-05-20T10:00',
    capacity: 20,
    lecturer: 'Mgr. Jana Nováková',
    location: 'Školiaca miestnosť A',
    onlineLink: '',
    description: 'Interné školenie pre personál urgentného príjmu.',
    requirements: 'Zamestnanecký preukaz',
    status: 'planned',
    occupied: 2,
    waitlisted: 0,
  };
}

function sampleRegistrations(trainingId: string): Registration[] {
  return [
    {
      id: 'reg-urgent-001',
      trainingId,
      employeeId: 'EMP-1042',
      employeeName: 'Bc. Peter Malina',
      employeeEmail: 'peter.malina@hospital.example',
      department: 'Urgent',
      note: 'Uprednostňuje ranný termín.',
      status: 'registered',
      registeredAt: '2026-05-01T09:15:00Z',
    },
    {
      id: 'reg-urgent-002',
      trainingId,
      employeeId: 'EMP-1077',
      employeeName: 'Mgr. Lucia Križová',
      employeeEmail: 'lucia.krizova@hospital.example',
      department: 'Chirurgia',
      note: '',
      status: 'registered',
      registeredAt: '2026-05-03T13:40:00Z',
    },
  ];
}

const sampleTrainingOptions: TrainingOption[] = [
  {
    id: 'urgent-safety-2026-05',
    title: 'BOZP pre urgentný príjem',
    startAt: '2026-05-20T08:00:00Z',
    department: 'Urgent',
    status: 'planned',
  },
  {
    id: 'icu-infection-2026-06',
    title: 'Prevencia infekcií na JIS',
    startAt: '2026-06-02T12:30:00Z',
    department: 'JIS',
    status: 'planned',
  },
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
