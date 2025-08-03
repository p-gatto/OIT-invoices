import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Product } from '../product.model';

@Component({
  selector: 'app-product-dialog',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './product-dialog.component.html',
  styleUrl: './product-dialog.component.scss'
})
export class ProductDialogComponent {
  productForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Product | null,
    private fb: FormBuilder
  ) {
    this.productForm = this.fb.group({
      name: [data?.name || '', Validators.required],
      description: [data?.description || ''],
      unit_price: [data?.unit_price || 0, [Validators.required, Validators.min(0)]],
      tax_rate: [data?.tax_rate || 22, Validators.required],
      category: [data?.category || ''],
      unit: [data?.unit || 'pz', Validators.required],
      is_active: [data?.is_active !== undefined ? data.is_active : true]
    });
  }

  onSubmit() {
    if (this.productForm.valid) {
      const result = { ...this.data, ...this.productForm.value };
      this.dialogRef.close(result);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

}