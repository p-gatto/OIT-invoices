import { Injectable } from '@angular/core';

import { Invoice } from '../../features/invoices/invoice.model';

@Injectable({
    providedIn: 'root'
})
export class XmlExportService {

    /**
     * Genera XML per fattura elettronica italiana (formato FatturaPA)
     */
    generateInvoiceXML(invoice: Invoice): string {
        const xml = this.buildXMLStructure(invoice);
        return xml;
    }

    /**
     * Scarica il file XML della fattura
     */
    downloadInvoiceXML(invoice: Invoice): void {
        const xmlContent = this.generateInvoiceXML(invoice);
        const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Nome file secondo convenzione FatturaPA: IT[CodiceFiscale]_[Progressivo].xml
        const fileName = `IT${invoice.customer?.vat_number || '00000000000'}_${invoice.invoice_number.replace(/[^0-9]/g, '')}.xml`;

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    private buildXMLStructure(invoice: Invoice): string {
        // Header XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';

        // Root elemento con namespace per FatturaPA
        xml += '<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" ';
        xml += 'xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" ';
        xml += 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ';
        xml += 'xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 ';
        xml += 'http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">\n';

        // FatturaElettronicaHeader
        xml += '  <FatturaElettronicaHeader>\n';
        xml += this.buildDatiTrasmissione(invoice);
        xml += this.buildCedentePrestatore();
        xml += this.buildCessionarioCommittente(invoice);
        xml += '  </FatturaElettronicaHeader>\n';

        // FatturaElettronicaBody
        xml += '  <FatturaElettronicaBody>\n';
        xml += this.buildDatiGenerali(invoice);
        xml += this.buildDatiBeniServizi(invoice);
        xml += this.buildDatiPagamento(invoice);
        xml += '  </FatturaElettronicaBody>\n';

        xml += '</p:FatturaElettronica>';

        return xml;
    }

    private buildDatiTrasmissione(invoice: Invoice): string {
        let xml = '    <DatiTrasmissione>\n';
        xml += '      <IdTrasmittente>\n';
        xml += '        <IdPaese>IT</IdPaese>\n';
        xml += '        <IdCodice>00000000000</IdCodice>\n'; // Codice fiscale del trasmittente
        xml += '      </IdTrasmittente>\n';
        xml += `      <ProgressivoInvio>${invoice.invoice_number.replace(/[^0-9]/g, '')}</ProgressivoInvio>\n`;
        xml += '      <FormatoTrasmissione>FPR12</FormatoTrasmissione>\n'; // Fattura verso privati
        xml += '      <CodiceDestinatario>0000000</CodiceDestinatario>\n'; // Codice per privati
        xml += '    </DatiTrasmissione>\n';
        return xml;
    }

    private buildCedentePrestatore(): string {
        let xml = '    <CedentePrestatore>\n';
        xml += '      <DatiAnagrafici>\n';
        xml += '        <IdFiscaleIVA>\n';
        xml += '          <IdPaese>IT</IdPaese>\n';
        xml += '          <IdCodice>12345678901</IdCodice>\n'; // P.IVA dell'azienda
        xml += '        </IdFiscaleIVA>\n';
        xml += '        <Anagrafica>\n';
        xml += '          <Denominazione>Invoice Manager SRL</Denominazione>\n';
        xml += '        </Anagrafica>\n';
        xml += '        <RegimeFiscale>RF01</RegimeFiscale>\n'; // Regime ordinario
        xml += '      </DatiAnagrafici>\n';
        xml += '      <Sede>\n';
        xml += '        <Indirizzo>Via Roma 1</Indirizzo>\n';
        xml += '        <CAP>20100</CAP>\n';
        xml += '        <Comune>Milano</Comune>\n';
        xml += '        <Provincia>MI</Provincia>\n';
        xml += '        <Nazione>IT</Nazione>\n';
        xml += '      </Sede>\n';
        xml += '    </CedentePrestatore>\n';
        return xml;
    }

    private buildCessionarioCommittente(invoice: Invoice): string {
        const customer = invoice.customer;
        let xml = '    <CessionarioCommittente>\n';
        xml += '      <DatiAnagrafici>\n';

        // Se ha P.IVA
        if (customer?.vat_number) {
            xml += '        <IdFiscaleIVA>\n';
            xml += '          <IdPaese>IT</IdPaese>\n';
            xml += `          <IdCodice>${this.escapeXML(customer.vat_number)}</IdCodice>\n`;
            xml += '        </IdFiscaleIVA>\n';
        }

        // Codice Fiscale
        if (customer?.tax_code) {
            xml += `        <CodiceFiscale>${this.escapeXML(customer.tax_code)}</CodiceFiscale>\n`;
        }

        xml += '        <Anagrafica>\n';
        xml += `          <Denominazione>${this.escapeXML(customer?.name || 'Cliente')}</Denominazione>\n`;
        xml += '        </Anagrafica>\n';
        xml += '      </DatiAnagrafici>\n';

        // Sede
        if (customer?.address) {
            xml += '      <Sede>\n';
            xml += `        <Indirizzo>${this.escapeXML(customer.address)}</Indirizzo>\n`;
            xml += '        <CAP>00000</CAP>\n'; // Dovrebbe essere estratto dall'indirizzo
            xml += '        <Comune>Città</Comune>\n'; // Dovrebbe essere estratto dall'indirizzo
            xml += '        <Nazione>IT</Nazione>\n';
            xml += '      </Sede>\n';
        }

        xml += '    </CessionarioCommittente>\n';
        return xml;
    }

    private buildDatiGenerali(invoice: Invoice): string {
        let xml = '    <DatiGenerali>\n';
        xml += '      <DatiGeneraliDocumento>\n';
        xml += '        <TipoDocumento>TD01</TipoDocumento>\n'; // TD01 = Fattura
        xml += '        <Divisa>EUR</Divisa>\n';
        xml += `        <Data>${invoice.issue_date}</Data>\n`;
        xml += `        <Numero>${this.escapeXML(invoice.invoice_number)}</Numero>\n`;

        // Importo totale documento
        xml += `        <ImportoTotaleDocumento>${invoice.total.toFixed(2)}</ImportoTotaleDocumento>\n`;

        // Note se presenti
        if (invoice.notes) {
            xml += `        <Causale>${this.escapeXML(invoice.notes)}</Causale>\n`;
        }

        xml += '      </DatiGeneraliDocumento>\n';
        xml += '    </DatiGenerali>\n';
        return xml;
    }

    private buildDatiBeniServizi(invoice: Invoice): string {
        let xml = '    <DatiBeniServizi>\n';

        // Dettaglio linee
        invoice.items.forEach((item, index) => {
            xml += '      <DettaglioLinee>\n';
            xml += `        <NumeroLinea>${index + 1}</NumeroLinea>\n`;
            xml += `        <Descrizione>${this.escapeXML(item.description)}</Descrizione>\n`;
            xml += `        <Quantita>${item.quantity.toFixed(2)}</Quantita>\n`;
            xml += `        <UnitaMisura>${this.escapeXML(item.unit || 'NR')}</UnitaMisura>\n`;
            xml += `        <PrezzoUnitario>${item.unit_price.toFixed(2)}</PrezzoUnitario>\n`;
            xml += `        <PrezzoTotale>${(item.quantity * item.unit_price).toFixed(2)}</PrezzoTotale>\n`;
            xml += `        <AliquotaIVA>${item.tax_rate.toFixed(2)}</AliquotaIVA>\n`;
            xml += '      </DettaglioLinee>\n';
        });

        // Riepilogo IVA per aliquota
        const riepilogoIVA = this.calcolaRiepilogoIVA(invoice);
        riepilogoIVA.forEach(riepilogo => {
            xml += '      <DatiRiepilogo>\n';
            xml += `        <AliquotaIVA>${riepilogo.aliquota.toFixed(2)}</AliquotaIVA>\n`;
            xml += `        <ImponibileImporto>${riepilogo.imponibile.toFixed(2)}</ImponibileImporto>\n`;
            xml += `        <Imposta>${riepilogo.imposta.toFixed(2)}</Imposta>\n`;
            xml += '      </DatiRiepilogo>\n';
        });

        xml += '    </DatiBeniServizi>\n';
        return xml;
    }

    private buildDatiPagamento(invoice: Invoice): string {
        let xml = '    <DatiPagamento>\n';
        xml += '      <CondizioniPagamento>TP02</CondizioniPagamento>\n'; // Pagamento completo
        xml += '      <DettaglioPagamento>\n';
        xml += '        <ModalitaPagamento>MP05</ModalitaPagamento>\n'; // Bonifico

        if (invoice.due_date) {
            xml += `        <DataScadenzaPagamento>${invoice.due_date}</DataScadenzaPagamento>\n`;
        }

        xml += `        <ImportoPagamento>${invoice.total.toFixed(2)}</ImportoPagamento>\n`;
        xml += '      </DettaglioPagamento>\n';
        xml += '    </DatiPagamento>\n';
        return xml;
    }

    private calcolaRiepilogoIVA(invoice: Invoice): Array<{ aliquota: number, imponibile: number, imposta: number }> {
        const riepilogo = new Map<number, { imponibile: number, imposta: number }>();

        invoice.items.forEach(item => {
            const imponibile = item.quantity * item.unit_price;
            const imposta = imponibile * (item.tax_rate / 100);

            if (riepilogo.has(item.tax_rate)) {
                const existing = riepilogo.get(item.tax_rate)!;
                existing.imponibile += imponibile;
                existing.imposta += imposta;
            } else {
                riepilogo.set(item.tax_rate, { imponibile, imposta });
            }
        });

        return Array.from(riepilogo.entries()).map(([aliquota, dati]) => ({
            aliquota,
            imponibile: dati.imponibile,
            imposta: dati.imposta
        }));
    }

    private escapeXML(text: string): string {
        if (!text) return '';

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}