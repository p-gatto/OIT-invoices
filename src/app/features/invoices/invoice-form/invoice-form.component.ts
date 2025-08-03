import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsyncPipe, CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogModule } from '@angular/material/dialog';
import { Invoice } from '../invoice.model';
import { Customer } from '../customer.model';
import { map, Observable, startWith } from 'rxjs';
import { InvoiceService } from '../invoice.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-invoice-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatDialogModule
  ],
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.scss'
})
export class InvoiceFormComponent implements OnInit {

  fb = inject(FormBuilder);
  invoiceService = inject(InvoiceService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  invoiceForm: FormGroup;
  customers = signal<Customer[]>([]);
  saving = signal(false);
  isEditMode = signal(false);
  currentInvoiceId = signal<string | null>(null);

  filteredCustomers!: Observable<Customer[]>;

  constructor() {
    this.invoiceForm = this.createForm();
  }

  ngOnInit() {
    this.loadCustomers();
    this.setupCustomerFilter();
    this.checkEditMode();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      invoice_number: [this.invoiceService.generateInvoiceNumber(), Validators.required],
      customer_id: ['', Validators.required],
      customer_search: ['', Validators.required],
      issue_date: [new Date(), Validators.required],
      due_date: [''],
      status: ['draft', Validators.required],
      notes: [''],
      items: this.fb.array([])
    });
  }

  private loadCustomers() {
    this.invoiceService.getCustomers().subscribe(customers => {
      this.customers.set(customers);
    });
  }

  private setupCustomerFilter() {
    this.filteredCustomers = this.invoiceForm.get('customer_search')!.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : value?.name;
        return name ? this._filterCustomers(name) : this.customers().slice();
      })
    );
  }

  private _filterCustomers(value: string): Customer[] {
    const filterValue = value.toLowerCase();
    return this.customers().filter(customer =>
      customer.name.toLowerCase().includes(filterValue) ||
      customer.email?.toLowerCase().includes(filterValue)
    );
  }

  private checkEditMode() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.currentInvoiceId.set(id);
      this.loadInvoiceForEdit(id);
    } else {
      this.addItem(); // Add first item for new invoice
    }
  }

  private loadInvoiceForEdit(id: string) {
    // Load invoice data for editing
    // This would typically be implemented in the service
    console.log('Loading invoice for edit:', id);
  }

  get itemsFormArray(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  addItem() {
    const itemForm = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit_price: [0, [Validators.required, Validators.min(0)]],
      tax_rate: [22, Validators.required],
      total: [0]
    });

    this.itemsFormArray.push(itemForm);
  }

  removeItem(index: number) {
    this.itemsFormArray.removeAt(index);
    this.calculateTotals();
  }

  calculateItemTotal(index: number) {
    const item = this.itemsFormArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unit_price')?.value || 0;
    const taxRate = item.get('tax_rate')?.value || 0;

    const subtotal = quantity * unitPrice;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    item.get('total')?.setValue(total, { emitEvent: false });
    this.calculateTotals();
  }

  private calculateTotals() {
    // Force recalculation of computed signals
    this.invoiceForm.updateValueAndValidity();
  }

  subtotal = computed(() => {
    return this.itemsFormArray.controls.reduce((sum, item) => {
      const quantity = item.get('quantity')?.value || 0;
      const unitPrice = item.get('unit_price')?.value || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  });

  taxAmount = computed(() => {
    return this.itemsFormArray.controls.reduce((sum, item) => {
      const quantity = item.get('quantity')?.value || 0;
      const unitPrice = item.get('unit_price')?.value || 0;
      const taxRate = item.get('tax_rate')?.value || 0;
      const subtotal = quantity * unitPrice;
      return sum + (subtotal * (taxRate / 100));
    }, 0);
  });

  total = computed(() => {
    return this.subtotal() + this.taxAmount();
  });

  displayCustomer(customer: Customer): string {
    return customer && customer.name ? customer.name : '';
  }

  onCustomerSelected(event: any) {
    const customer = event.option.value as Customer;
    this.invoiceForm.get('customer_id')?.setValue(customer.id);
  }

  saveInvoice() {
    if (this.invoiceForm.invalid) {
      this.snackBar.open('Completa tutti i campi obbligatori', 'Chiudi', { duration: 3000 });
      return;
    }

    this.saving.set(true);

    const formValue = this.invoiceForm.value;
    const invoice: Omit<Invoice, 'id'> = {
      invoice_number: formValue.invoice_number,
      customer_id: formValue.customer_id,
      issue_date: formValue.issue_date,
      due_date: formValue.due_date,
      subtotal: this.subtotal(),
      tax_amount: this.taxAmount(),
      total: this.total(),
      status: formValue.status,
      notes: formValue.notes,
      items: formValue.items
    };

    this.invoiceService.createInvoice(invoice).subscribe({
      next: (savedInvoice) => {
        this.saving.set(false);
        this.snackBar.open('Fattura salvata con successo', 'Chiudi', { duration: 3000 });
        this.router.navigate(['/invoices', savedInvoice.id]);
      },
      error: (error) => {
        this.saving.set(false);
        this.snackBar.open('Errore durante il salvataggio', 'Chiudi', { duration: 3000 });
        console.error('Error saving invoice:', error);
      }
    });
  }

  goBack() {
    this.router.navigate(['/invoices']);
  }

}