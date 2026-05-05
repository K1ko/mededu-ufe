import { Component, Event as StencilEvent, EventEmitter, Host, Prop, State, h } from '@stencil/core';

import '@material/web/button/filled-button';
import '@material/web/button/outlined-button';
import '@material/web/icon/icon';
import '@material/web/progress/linear-progress';
import '@material/web/select/outlined-select';
import '@material/web/select/select-option';
import '@material/web/textfield/outlined-text-field';

export type TrainingStatus = 'planned' | 'cancelled' | 'archived';

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

  @State() private form: TrainingForm = this.emptyTraining();
  @State() private loading = false;
  @State() private errorMessage = '';
  @State() private savedMessage = '';

  async componentWillLoad() {
    await this.loadTraining();
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

            <md-outlined-text-field
              required
              label="Oddelenie / odbornosť"
              value={this.form.department}
              onInput={(event: InputEvent) => this.updateField('department', this.eventValue(event))}>
              <md-icon slot="leading-icon">local_hospital</md-icon>
            </md-outlined-text-field>
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
      </Host>
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

      const response = await fetch(`${this.apiBase.replace(/\/$/, '')}/trainings/${encodeURIComponent(this.trainingId)}`);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      this.form = this.fromApiTraining(await response.json());
    } catch (error: any) {
      this.form = sampleTraining(this.trainingId);
      this.errorMessage = `Nepodarilo sa načítať školenie z API: ${error.message || 'neznáma chyba'}`;
    } finally {
      this.loading = false;
    }
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
      const payload = this.toApiTraining();

      if (this.apiBase) {
        const isNew = this.trainingId === '@new';
        const url = isNew
          ? `${this.apiBase.replace(/\/$/, '')}/trainings`
          : `${this.apiBase.replace(/\/$/, '')}/trainings/${encodeURIComponent(this.trainingId)}`;
        const response = await fetch(url, {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
      }

      this.savedMessage = 'Školenie bolo uložené.';
      this.trainingSaved.emit(payload);
    } catch (error: any) {
      this.errorMessage = `Nepodarilo sa uložiť školenie: ${error.message || 'neznáma chyba'}`;
    } finally {
      this.loading = false;
    }
  }

  private async archiveTraining() {
    this.form = { ...this.form, status: 'archived' };
    await this.saveTraining(new Event('submit'));
    this.trainingArchived.emit(this.trainingId);
  }

  private updateField<Field extends keyof TrainingForm>(field: Field, value: TrainingForm[Field]) {
    this.form = { ...this.form, [field]: value };
    this.savedMessage = '';
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
    };
  }

  private fromApiTraining(training: any): TrainingForm {
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
      status: training.status || 'planned',
    };
  }

  private toApiTraining(): TrainingForm {
    return {
      ...this.form,
      id: this.trainingId === '@new' ? this.form.id : this.trainingId,
      startAt: this.form.startAt ? new Date(this.form.startAt).toISOString() : '',
    };
  }

  private toDatetimeLocal(value: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
  };
}
