import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { Customer } from '../customer.model';

@Component({
  selector: 'app-customer-diaog',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './customer-diaog.component.html',
  styleUrl: './customer-diaog.component.scss'
})
export class CustomerDiaogComponent {

  customerForm: FormGroup;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<CustomerDiaogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Customer | null,
    private fb: FormBuilder
  ) {
    this.customerForm = this.fb.group({
      name: [data?.name || '', Validators.required],
      email: [data?.email || '', [Validators.email]],
      phone: [data?.phone || ''],
      address: [data?.address || ''],
      tax_code: [data?.tax_code || '', [Validators.pattern(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i)]],
      vat_number: [data?.vat_number || '', [Validators.pattern(/^\d{11}$/)]],
      notes: [(data as any)?.notes || '']
    });

    // Trasforma il codice fiscale in maiuscolo automaticamente
    this.customerForm.get('tax_code')?.valueChanges.subscribe(value => {
      if (value && value !== value.toUpperCase()) {
        this.customerForm.get('tax_code')?.setValue(value.toUpperCase(), { emitEvent: false });
      }
    });
  }

  onSubmit() {
    if (this.customerForm.valid) {
      this.saving = true;
      const result = { ...this.data, ...this.customerForm.value };
      // Rimuovi campi vuoti per evitare di sovrascrivere con stringhe vuote
      Object.keys(result).forEach(key => {
        if (result[key] === '') {
          result[key] = null;
        }
      });
      this.dialogRef.close(result);
    } else {
      // Marca tutti i campi come touched per mostrare gli errori
      Object.keys(this.customerForm.controls).forEach(key => {
        this.customerForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

}