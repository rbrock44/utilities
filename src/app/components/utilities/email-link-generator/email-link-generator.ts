import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-email-link-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-link-generator.html',
  styleUrl: './email-link-generator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailLinkGeneratorComponent {
  email = '';
  subject = '';
  body = '';
  generatedLink = '';
  justCopied = false;
  private copiedTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  generateLink(): void {
    if (this.email.trim() === '') {
      this.generatedLink = '';
      return;
    }

    let link = `mailto:${this.email.trim()}`;
    const params: string[] = [];

    if (this.subject.trim() !== '') {
      params.push(`subject=${encodeURIComponent(this.subject.trim())}`);
    }

    if (this.body.trim() !== '') {
      params.push(`body=${encodeURIComponent(this.body.trim())}`);
    }

    if (params.length > 0) {
      link += `?${params.join('&')}`;
    }

    this.generatedLink = link;
  }

  async copyToClipboard(): Promise<void> {
    if (this.generatedLink === '') {
      return;
    }

    await navigator.clipboard.writeText(this.generatedLink);

    this.justCopied = true;
    this.cdr.markForCheck();

    if (this.copiedTimeout) {
      clearTimeout(this.copiedTimeout);
    }
    this.copiedTimeout = setTimeout(() => {
      this.justCopied = false;
      this.cdr.markForCheck();
    }, 2000);
  }
}
