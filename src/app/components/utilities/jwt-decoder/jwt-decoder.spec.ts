import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JwtDecoderComponent } from './jwt-decoder';

describe('JwtDecoderComponent', () => {
  let component: JwtDecoderComponent;
  let fixture: ComponentFixture<JwtDecoderComponent>;

  // A real JWT encodes UTF-8 bytes before base64url; bare btoa would emit
  // Latin-1 for anything non-ASCII and the decoder would rightly reject it.
  const base64Url = (value: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const makeToken = (
    payload: Record<string, unknown>,
    header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }
  ) => `${base64Url(header)}.${base64Url(payload)}.fakesignature`;

  const enter = (token: string) => {
    component.token = token;
    component.decode();
  };

  const nowSeconds = () => Math.floor(Date.now() / 1000);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JwtDecoderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JwtDecoderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should decode the header and payload', () => {
    enter(makeToken({ sub: '12345', name: 'Ada' }));

    expect(component.decoded).toBe(true);
    expect(component.header!['alg']).toBe('HS256');
    expect(component.payload!['sub']).toBe('12345');
    expect(component.errorMessage).toBeNull();
  });

  it('should keep the signature as text without verifying it', () => {
    enter(makeToken({ sub: '1' }));

    expect(component.signature).toBe('fakesignature');
  });

  it('should pretty-print both segments', () => {
    enter(makeToken({ sub: '1' }));

    expect(component.payloadJson).toContain('\n');
    expect(component.headerJson).toContain('"alg"');
  });

  it('should reject a token without three parts', () => {
    enter('abc.def');

    expect(component.errorMessage).toContain('three dot-separated parts');
    expect(component.decoded).toBe(false);
  });

  it('should reject a segment that is not base64url', () => {
    enter('!!!.!!!.sig');

    expect(component.errorMessage).toContain('base64url');
  });

  it('should reject a segment that decodes to invalid JSON', () => {
    const notJson = btoa('hello there').replace(/=+$/, '');
    enter(`${notJson}.${base64Url({ sub: '1' })}.sig`);

    expect(component.errorMessage).toContain('not valid JSON');
  });

  it('should reject a payload that is not a JSON object', () => {
    enter(`${base64Url({ alg: 'HS256' })}.${base64Url([1, 2, 3])}.sig`);

    expect(component.errorMessage).toContain('not a JSON object');
  });

  it('should report a token that is still valid', () => {
    enter(makeToken({ exp: nowSeconds() + 3600 }));

    expect(component.expiryState).toBe('valid');
    expect(component.expiryLabel).toContain('Expires');
  });

  it('should report an expired token', () => {
    enter(makeToken({ exp: nowSeconds() - 3600 }));

    expect(component.expiryState).toBe('expired');
    expect(component.expiryLabel).toContain('Expired');
  });

  it('should report a token that is not valid yet', () => {
    enter(makeToken({ nbf: nowSeconds() + 3600, exp: nowSeconds() + 7200 }));

    expect(component.expiryState).toBe('not-yet-valid');
  });

  it('should report when there is no expiry claim', () => {
    enter(makeToken({ sub: '1' }));

    expect(component.expiryState).toBe('no-expiry');
    expect(component.expiryLabel).toBe('No expiry claim');
  });

  it('should list timestamp claims with absolute and relative values', () => {
    enter(makeToken({ iat: nowSeconds() - 60, exp: nowSeconds() + 60 }));

    const keys = component.timeClaims.map((claim) => claim.key);
    expect(keys).toEqual(['iat', 'exp']);
    expect(component.timeClaims[0].absolute).toBeTruthy();
    expect(component.timeClaims[0].relative).toBeTruthy();
  });

  it('should separate non-timestamp claims and label the registered ones', () => {
    enter(makeToken({ iss: 'me', sub: '1', custom: 'x', exp: nowSeconds() + 60 }));

    const labels = component.otherClaims.map((claim) => claim.label);
    expect(labels).toContain('Issuer');
    expect(labels).toContain('Subject');
    expect(labels).toContain('custom');
    expect(labels).not.toContain('Expires');
  });

  it('should stringify object claims', () => {
    enter(makeToken({ roles: ['admin', 'user'] }));

    const roles = component.otherClaims.find((claim) => claim.key === 'roles');
    expect(roles!.value).toBe('["admin","user"]');
  });

  it('should flag an unsigned token', () => {
    enter(makeToken({ sub: '1' }, { alg: 'none' }));

    expect(component.algorithmIsNone).toBe(true);
  });

  it('should not flag a normally signed token', () => {
    enter(makeToken({ sub: '1' }));

    expect(component.algorithmIsNone).toBe(false);
  });

  it('should decode multi-byte characters in claims', () => {
    enter(makeToken({ name: 'héllo' }));

    expect(component.payload!['name']).toBe('héllo');
  });

  it('should clear everything', () => {
    enter(makeToken({ sub: '1' }));
    component.clear();

    expect(component.token).toBe('');
    expect(component.decoded).toBe(false);
    expect(component.signature).toBe('');
  });
});
