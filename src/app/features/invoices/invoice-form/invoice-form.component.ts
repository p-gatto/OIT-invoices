import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { debounceTime, distinctUntilChanged, map, Observable, startWith } from 'rxjs';

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
import { MatChipsModule } from '@angular/material/chips';

import { Customer } from '../../customers/customer.model';

import { Invoice } from '../invoice.model';
import { InvoiceService } from '../invoice.service';
import { InvoiceItem } from '../invoice-item.model';

import { Product } from '../../products/product.model';
import { ProductService } from '../../products/product.service';

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
    MatDialogModule,
    MatChipsModule
  ],
  templateUrl: './invoice-form.component.html',
  styleUrl: './invoice-form.component.scss'
})
export class InvoiceFormComponent implements OnInit {

  fb = inject(FormBuilder);
  invoiceService = inject(InvoiceService);
  productService = inject(ProductService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  invoiceForm: FormGroup;
  customers = signal<Customer[]>([]);
  products = signal<Product[]>([]);
  saving = signal(false);
  isEditMode = signal(false);
  currentInvoiceId = signal<string | null>(null);

  filteredCustomers!: Observable<Customer[]>;
  filteredProducts: Observable<Product[]>[] = [];

  constructor() {
    this.invoiceForm = this.createForm();
  }

  ngOnInit() {
    this.loadData();
    this.setupCustomerFilter();
    this.checkEditMode();
    this.checkQueryParams();
  }

  private loadData() {
    // Carica clienti
    this.invoiceService.getCustomers().subscribe(customers => {
      this.customers.set(customers);
    });

    // Carica prodotti
    this.productService.getProducts().subscribe(products => {
      this.products.set(products);
    });
  }

  private checkQueryParams() {
    const customerId = this.route.snapshot.queryParamMap.get('customerId');
    if (customerId) {
      this.invoiceService.getCustomers().subscribe(customers => {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          this.invoiceForm.get('customer_search')?.setValue(customer);
          this.invoiceForm.get('customer_id')?.setValue(customer.id);
        }
      });
    }
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

  private setupCustomerFilter() {
    this.filteredCustomers = this.invoiceForm.get('customer_search')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
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
      customer.email?.toLowerCase().includes(filterValue) ||
      customer.vat_number?.toLowerCase().includes(filterValue)
    );
  }

  private setupProductFilter(index: number) {
    const itemControl = this.itemsFormArray.at(index);
    const productSearchControl = itemControl.get('product_search');

    if (productSearchControl) {
      this.filteredProducts[index] = productSearchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        map(value => {
          const name = typeof value === 'string' ? value : value?.name;
          return name ? this._filterProducts(name) : this.products().slice();
        })
      );
    }
  }

  private _filterProducts(value: string): Product[] {
    const filterValue = value.toLowerCase();
    return this.products().filter(product =>
      product.name.toLowerCase().includes(filterValue) ||
      product.description?.toLowerCase().includes(filterValue) ||
      product.category?.toLowerCase().includes(filterValue)
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
    this.invoiceService.getInvoiceById(id).subscribe({
      next: (invoice) => {
        if (invoice) {
          this.populateForm(invoice);
        }
      },
      error: (error) => {
        this.snackBar.open('Errore durante il caricamento della fattura', 'Chiudi', { duration: 3000 });
        console.error('Error loading invoice:', error);
      }
    });
  }

  private populateForm(invoice: Invoice) {
    // Popola i dati della fattura
    this.invoiceForm.patchValue({
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      customer_search: invoice.customer,
      issue_date: new Date(invoice.issue_date),
      due_date: invoice.due_date ? new Date(invoice.due_date) : null,
      status: invoice.status,
      notes: invoice.notes
    });

    // Pulisci gli items esistenti e aggiungi quelli della fattura
    this.itemsFormArray.clear();
    invoice.items.forEach((item, index) => {
      this.addItemWithData(item);
    });
  }

  get itemsFormArray(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  addItem() {
    const itemIndex = this.itemsFormArray.length;
    const itemForm = this.fb.group({
      product_id: [''],
      product_search: ['', Validators.required],
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit_price: [0, [Validators.required, Validators.min(0)]],
      tax_rate: [22, Validators.required],
      total: [0],
      unit: ['pz']
    });

    this.itemsFormArray.push(itemForm);
    this.setupProductFilter(itemIndex);

    // Setup reactive changes for calculations
    this.setupItemCalculations(itemIndex);
  }

  addItemWithData(item: InvoiceItem) {
    const itemIndex = this.itemsFormArray.length;
    const itemForm = this.fb.group({
      product_id: [item.id || ''],
      product_search: [''],
      description: [item.description, Validators.required],
      quantity: [item.quantity, [Validators.required, Validators.min(0.01)]],
      unit_price: [item.unit_price, [Validators.required, Validators.min(0)]],
      tax_rate: [item.tax_rate, Validators.required],
      total: [item.total],
      unit: ['pz']
    });

    this.itemsFormArray.push(itemForm);
    this.setupProductFilter(itemIndex);
    this.setupItemCalculations(itemIndex);
  }

  private setupItemCalculations(index: number) {
    const item = this.itemsFormArray.at(index);

    // Listen to changes in quantity, unit_price, or tax_rate
    ['quantity', 'unit_price', 'tax_rate'].forEach(field => {
      item.get(field)?.valueChanges.subscribe(() => {
        this.calculateItemTotal(index);
      });
    });
  }

  removeItem(index: number) {
    this.itemsFormArray.removeAt(index);
    this.filteredProducts.splice(index, 1);
    this.calculateTotals();
  }

  onProductSelected(event: any, index: number) {
    const product = event.option.value as Product;
    const item = this.itemsFormArray.at(index);

    // Auto-popola i campi del prodotto
    item.patchValue({
      product_id: product.id,
      description: product.name + (product.description ? ' - ' + product.description : ''),
      unit_price: product.unit_price,
      tax_rate: product.tax_rate,
      unit: product.unit
    });

    // Ricalcola il totale
    this.calculateItemTotal(index);
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

  displayProduct(product: Product): string {
    return product && product.name ? product.name : '';
  }

  onCustomerSelected(event: any) {
    const customer = event.option.value as Customer;
    this.invoiceForm.get('customer_id')?.setValue(customer.id);
  }

  // Quick add product methods
  addServiceHours() {
    this.addItem();
    const lastIndex = this.itemsFormArray.length - 1;
    const lastItem = this.itemsFormArray.at(lastIndex);

    lastItem.patchValue({
      description: 'Ore di servizio',
      quantity: 1,
      unit_price: 50,
      tax_rate: 22,
      unit: 'ore'
    });

    this.calculateItemTotal(lastIndex);
  }

  addConsultancy() {
    this.addItem();
    const lastIndex = this.itemsFormArray.length - 1;
    const lastItem = this.itemsFormArray.at(lastIndex);

    lastItem.patchValue({
      description: 'Consulenza tecnica',
      quantity: 1,
      unit_price: 80,
      tax_rate: 22,
      unit: 'ore'
    });

    this.calculateItemTotal(lastIndex);
  }

  duplicateItem(index: number) {
    const sourceItem = this.itemsFormArray.at(index);
    const itemData = sourceItem.value;

    // Remove IDs for duplication
    delete itemData.product_id;

    this.addItem();
    const newIndex = this.itemsFormArray.length - 1;
    const newItem = this.itemsFormArray.at(newIndex);

    newItem.patchValue(itemData);
    this.calculateItemTotal(newIndex);
  }

  saveInvoice() {
    if (this.invoiceForm.invalid) {
      this.markFormGroupTouched(this.invoiceForm);
      this.snackBar.open('Completa tutti i campi obbligatori', 'Chiudi', { duration: 3000 });
      return;
    }

    if (this.itemsFormArray.length === 0) {
      this.snackBar.open('Aggiungi almeno una riga alla fattura', 'Chiudi', { duration: 3000 });
      return;
    }

    this.saving.set(true);

    const formValue = this.invoiceForm.value;

    // Prepara gli items pulendo i dati non necessari
    const items: InvoiceItem[] = formValue.items.map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      tax_rate: Number(item.tax_rate),
      total: Number(item.total)
    }));

    const invoiceData: Omit<Invoice, 'id' | 'created_at'> = {
      invoice_number: formValue.invoice_number,
      customer_id: formValue.customer_id,
      issue_date: formValue.issue_date,
      due_date: formValue.due_date,
      subtotal: this.subtotal(),
      tax_amount: this.taxAmount(),
      total: this.total(),
      status: formValue.status,
      notes: formValue.notes,
      items: items
    };

    const operation$ = this.isEditMode() && this.currentInvoiceId()
      ? this.invoiceService.updateInvoice({ ...invoiceData, id: this.currentInvoiceId()! } as Invoice)
      : this.invoiceService.createInvoice(invoiceData);

    operation$.subscribe({
      next: (savedInvoice) => {
        this.saving.set(false);
        const message = this.isEditMode() ? 'Fattura aggiornata con successo' : 'Fattura salvata con successo';
        this.snackBar.open(message, 'Chiudi', { duration: 3000 });
        this.router.navigate(['/invoices', savedInvoice.id]);
      },
      error: (error) => {
        this.saving.set(false);
        const message = this.isEditMode() ? 'Errore durante l\'aggiornamento' : 'Errore durante il salvataggio';
        this.snackBar.open(message, 'Chiudi', { duration: 3000 });
        console.error('Error saving invoice:', error);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  goBack() {
    this.router.navigate(['/invoices']);
  }

}