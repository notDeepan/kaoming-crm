# Start using the local CRM

Open `http://127.0.0.1:3000/login` and sign in as the local administrator. The
current preview uses the clean `kaoming_live` database. The separate `kaoming`
database contains worked examples; its records do not appear here.

## Make the first quotation

1. **Add an agent:** Open **Agents → Add partner**. Enter the agent's code, name,
   country, region and commercial model. Open the saved agent to complete its
   destination compliance profile and contract terms when known.
2. **Add a machine model:** Open **Products → Machine models**. Enter the model
   code and English and Traditional Chinese names. Add its real proposal PDF and
   bilingual base specifications when available.
3. **Add items:** Open **Products → Items**. Add the base machine and any options
   you plan to quote. Each item needs its English name and factory 品名. Select
   the relevant model and specification category where applicable.
4. **Publish prices:** Open **Products → Price book versions → Upload and publish
   a price list**. Download the CSV template, fill prices for the item codes you
   entered, upload it, resolve validation errors, review the diff and publish a
   version effective today. A quotation cannot start until a published price book
   is effective. Future prices are published as new versions; issued quotations
   retain their original prices.
5. **Create the deal:** Open **Deals → New deal**, choose the agent and model, then
   **Start quotation**. Add priced machine and option lines. Enter each line's
   discount and the commercial terms.
6. **Issue the quotation:** Record the confirmed design review and attach the
   engineering proposal PDF for this revision, or generate a proposal after the
   model literature and bilingual specifications are ready. A discounted quote
   also needs the required manager and GM approvals. Select **Issue final
   quotation**, then **Print quotation** to download the PDF.

The deal's **PI 訂單**, **MI 製令單**, production and delivery tabs continue the
workflow as information arrives. Customer records, claims, after-sales cases and
parts requests can also be entered as those events happen.

Entries build the CRM's reusable customer, model, item, price and transaction
records. This is data accumulation, not automatic AI training. The historical
reports will only reflect records entered here until separate reporting history
is provided; that does not prevent making current quotations.

## Protect entered records

Run `powershell -File scripts/backup-local.ps1` from the project directory. It
backs up the database selected by `.env.local` and writes a checksum beside the
dump in `backup/`. Copy backups you need to keep to encrypted storage outside
this computer. The local app and worker can stay running during this backup.
