import { Component, Inject } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';


export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss'
})
export class ConfirmationDialogComponent {
  constructor(
    // MatDialogRef permette di chiudere il dialogo e passare un risultato
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    // MAT_DIALOG_DATA inietta i dati passati al dialogo (definiti dall'interfaccia ConfirmationDialogData)
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) { }

  /**
   * Gestisce il click sul bottone "Annulla".
   * Chiude il dialogo passando 'false' come risultato.
   */
  onNoClick(): void {
    this.dialogRef.close(false);
  }

  /**
   * Gestisce il click sul bottone "Conferma".
   * Chiude il dialogo passando 'true' come risultato.
   */
  onYesClick(): void {
    this.dialogRef.close(true);
  }

}