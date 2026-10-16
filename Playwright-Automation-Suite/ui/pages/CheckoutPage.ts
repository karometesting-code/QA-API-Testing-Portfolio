import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly finishButton: Locator;
  readonly errorMessage: Locator;
  readonly subtotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;
  readonly completeHeader: Locator;

  constructor(page: Page) {
    this.page = page;
    // Los 3 inputs tienen aria-label propio (First Name / Last Name /
    // Zip/Postal Code) — getByLabel por encima de [data-test="..."].
    this.firstNameInput = page.getByLabel('First Name');
    this.lastNameInput = page.getByLabel('Last Name');
    this.postalCodeInput = page.getByLabel('Zip/Postal Code');
    // Ambos son <input type="submit">/<button> con nombre accesible propio.
    this.continueButton = page.getByRole('button', { name: 'Continue' });
    this.finishButton = page.getByRole('button', { name: 'Finish' });
    this.errorMessage = page.getByRole('alert');
    // Los montos no tienen rol propio (son <div> de texto): getByTestId.
    this.subtotalLabel = page.getByTestId('subtotal-label');
    this.taxLabel = page.getByTestId('tax-label');
    this.totalLabel = page.getByTestId('total-label');
    // Es un <h2>: heading de nivel 2, único en la página de confirmación.
    this.completeHeader = page.getByRole('heading', { level: 2 });
  }

  async fillInfo(firstName: string, lastName: string, postalCode: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continueToOverview() {
    await this.continueButton.click();
  }

  async finishPurchase() {
    await this.finishButton.click();
  }

  private async extractAmount(locator: Locator, prefix: string): Promise<number> {
    const text = await locator.innerText();
    return Number(text.replace(prefix, '').replace('$', '').trim());
  }

  async getSubtotal(): Promise<number> {
    return this.extractAmount(this.subtotalLabel, 'Item total:');
  }

  async getTax(): Promise<number> {
    return this.extractAmount(this.taxLabel, 'Tax:');
  }

  async getTotal(): Promise<number> {
    return this.extractAmount(this.totalLabel, 'Total:');
  }
}
