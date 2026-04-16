/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { BusinessPolicy, parseTagAssistantJson } from './logic';

describe('BusinessPolicy', () => {
  describe('isEmError', () => {
    it('should return true for tv.1', () => {
      expect(BusinessPolicy.isEmError('tv.1')).toBe(true);
    });

    it('should return true for tv.1~', () => {
      expect(BusinessPolicy.isEmError('tv.1~')).toBe(true);
    });

    it('should return true for tv.1~e1', () => {
      expect(BusinessPolicy.isEmError('tv.1~e1')).toBe(true);
    });

    it('should return false for valid em values', () => {
      expect(BusinessPolicy.isEmError('3.1.1.1.1.1.1.1.1')).toBe(false);
      expect(BusinessPolicy.isEmError('')).toBe(false);
    });
  });

  describe('isStatusError', () => {
    it('should return true for 404', () => {
      expect(BusinessPolicy.isStatusError(404)).toBe(true);
    });

    it('should return false for 200', () => {
      expect(BusinessPolicy.isStatusError(200)).toBe(false);
    });
  });

  describe('getEventType', () => {
    it('should identify Conversion from URL', () => {
      expect(BusinessPolicy.getEventType('https://example.com/pagead/conversion/123')).toBe('Conversion');
      expect(BusinessPolicy.getEventType('https://example.com/viewthroughconversion/123')).toBe('Conversion');
    });

    it('should identify UPDE from URL', () => {
      expect(BusinessPolicy.getEventType('https://example.com/ccm/form-data')).toBe('UPDE');
      expect(BusinessPolicy.getEventType('https://example.com/pagead/form-data')).toBe('UPDE');
    });

    it('should identify from title', () => {
      expect(BusinessPolicy.getEventType('https://example.com', 'Conversion')).toBe('Conversion');
      expect(BusinessPolicy.getEventType('https://example.com', 'User provided data')).toBe('UPDE');
    });

    it('should return other for unknown patterns', () => {
      expect(BusinessPolicy.getEventType('https://example.com/other')).toBe('other');
    });
  });
});

describe('parseTagAssistantJson', () => {
  it('should parse a simple Tag Assistant JSON', () => {
    const mockJson = {
      timestamp: Date.now(),
      data: {
        containers: [
          {
            messages: [
              {
                gtagCommandModel: {
                  hits: [
                    {
                      baseUrl: 'www.googleadservices.com/pagead/conversion/123/',
                      parameters: [
                        { name: 'em', value: 'tv.1' },
                        { name: 'ecsid', value: 'abc' }
                      ],
                      title: 'Conversion'
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    };

    const entries = parseTagAssistantJson(mockJson);
    expect(entries).toHaveLength(1);
    expect(entries[0]._em).toBe('tv.1');
    expect(entries[0]._ecsid).toBe('abc');
    expect(entries[0]._eventType).toBe('Conversion');
  });
});
