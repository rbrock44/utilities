import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreciousMetalsComponent } from './precious-metals';
import { goldTypes, silverTypes } from '../../../constants/constants';

describe('PreciousMetalsComponent', () => {
  let component: PreciousMetalsComponent;
  let fixture: ComponentFixture<PreciousMetalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreciousMetalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreciousMetalsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('removes a gold row when there is more than one', () => {
    component.addGoldRow();
    const keep = component.goldRows[1];
    component.removeGoldRow(component.goldRows[0].id);
    expect(component.goldRows).toEqual([keep]);
  });

  it('resets the only gold row to defaults instead of removing it', () => {
    const row = component.goldRows[0];
    row.type = goldTypes[goldTypes.length - 1].name;
    row.weight = 12;
    row.unit = 'toz';

    component.removeGoldRow(row.id);

    expect(component.goldRows.length).toBe(1);
    expect(component.goldRows[0]).toMatchObject({ type: goldTypes[0].name, weight: 0, unit: 'grams' });
  });

  it('resets the only silver row to defaults instead of removing it', () => {
    const row = component.silverRows[0];
    row.type = silverTypes[silverTypes.length - 1].name;
    row.weight = 5;
    row.unit = 'toz';

    component.removeSilverRow(row.id);

    expect(component.silverRows.length).toBe(1);
    expect(component.silverRows[0]).toMatchObject({ type: silverTypes[0].name, weight: 0, unit: 'grams' });
  });

  it('keeps the remove button enabled on the last row', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.remove-btn') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);
    buttons.forEach(button => expect(button.disabled).toBe(false));
  });
});
