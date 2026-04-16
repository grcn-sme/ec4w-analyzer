/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HARData {
  log: {
    entries: HAREntry[];
  };
}

export interface HAREntry {
  _id?: string;
  _seq?: number;
  _em?: string;
  _eme?: string;
  _label?: string;
  _ecsid?: string;
  _ecMode?: string;
  _eventType?: string;
  _errorDescription?: string;
  request: {
    method: string;
    url: string;
    headers: { name: string; value: string }[];
    queryString: { name: string; value: string }[];
    postData?: {
      mimeType: string;
      text?: string;
      params?: { name: string; value: string }[];
    };
  };
  response: {
    status: number;
    statusText: string;
    headers: { name: string; value: string }[];
    content: {
      size: number;
      mimeType: string;
      text?: string;
      encoding?: string;
    };
  };
  time: number;
  startedDateTime: string;
}
