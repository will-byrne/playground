import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';
import '@testing-library/jest-dom/vitest';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { afterEach } from 'vitest';

// The dynamic testing module attaches rendered components to document.body.
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.innerHTML = '';
});
