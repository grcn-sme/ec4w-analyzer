/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAREntry } from '../types';

export const BusinessPolicy = {
  isEmError: (em: string) => {
    if (em === 'tv.1') return true;
    if (/^tv\.1~e[0-9]/.test(em)) return true;
    if (em === 'tv.1~') return true; // gtg eme
    return false;
  },
  
  isStatusError: (status: number) => {
    return status < 200 || status >= 400;
  },
  
  getErrorDescription: (em: string, status: number) => {
    if (BusinessPolicy.isEmError(em)) return `EM Error: ${em}`;
    if (BusinessPolicy.isStatusError(status)) return `HTTP Error: ${status}`;
    return '';
  },
  
  getEventType: (url: string, title?: string) => {
    const urlLower = url.toLowerCase();
    const titleLower = (title || '').toLowerCase();

    // UPDE Patterns
    if (
      urlLower.includes('/ccm/form-data') || 
      urlLower.includes('/pagead/form-data') ||
      titleLower.includes('user provided data')
    ) return 'UPDE';

    // Conversion Patterns
    if (
      urlLower.includes('/pagead/conversion') || 
      urlLower.includes('/viewthroughconversion') ||
      titleLower.includes('conversion')
    ) return 'Conversion';

    return 'other';
  }
};

export function parseTagAssistantJson(json: any): HAREntry[] {
  const entries: HAREntry[] = [];
  const containers = json.data?.containers || [];
  const jsonTimeStamp = new Date(json.timestamp).toISOString();

  containers.forEach((container: any) => {
    const messages = container.messages || [];
    messages.forEach((message: any) => {
      // Look for hits in multiple possible locations
      const hitLocations = [
        message.gtagCommandModel?.hits,
        message.ga4CommandModel?.hits,
        message.googleAdsCommandModel?.hits,
        message.hits
      ];

      hitLocations.forEach(hits => {
        if (!Array.isArray(hits)) return;

        hits.forEach((hit: any) => {
          try {
            const baseUrl = hit.baseUrl || '';
            const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
            const parameters = hit.parameters || [];
            
            parameters.forEach((p: any) => {
              url.searchParams.set(p.name, p.value);
            });

            // Pre-extract parameters for better fidelity
            const em = parameters.find((p: any) => p.name === 'em')?.value || '';
            const eme = parameters.find((p: any) => p.name === 'eme')?.value || '';
            const ecsid = parameters.find((p: any) => p.name === 'ecsid')?.value || '';
            const ecMode = parameters.find((p: any) => p.name === 'ec_mode')?.value || '';
            const label = parameters.find((p: any) => p.name === 'label')?.value || '';
            
            const fullUrl = url.toString();
            const title = hit.title || hit.subtitle || '';
            const eventType = BusinessPolicy.getEventType(fullUrl, title);

            entries.push({
              _em: em,
              _eme: eme,
              _ecsid: ecsid,
              _ecMode: ecMode,
              _label: label,
              _eventType: eventType,
              request: {
                method: 'GET',
                url: fullUrl,
                headers: [],
                queryString: parameters
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [],
                content: { size: 0, mimeType: 'text/plain' }
              },
              time: 0,
              startedDateTime: jsonTimeStamp
            });
          } catch (e) {
            console.warn('Failed to parse hit:', hit, e);
            entries.push({
              _em: '',
              _eme: '',
              _ecsid: '',
              _ecMode: '',
              _label: '',
              _eventType: BusinessPolicy.getEventType('', ''),
              request: {
                method: 'GET',
                url: '',
                headers: [],
                queryString: [] as any
              },
              response: {
                status: 500,
                statusText: 'error',
                headers: [],
                content: { size: 0, mimeType: 'text/plain' }
              },
              time: 0,
              startedDateTime: jsonTimeStamp
            });
          }
        });
      });
    });
  });
  
  return entries;
}
