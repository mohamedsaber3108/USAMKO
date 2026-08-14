import { Injectable, Logger } from '@nestjs/common';

export interface GoogleMapsLead {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  location?: {
    lat: number;
    lng: number;
  };
  placeId?: string;
}

@Injectable()
export class MapsWorkerService {
  private readonly logger = new Logger(MapsWorkerService.name);
  private websocketConnections: Map<string, any> = new Map();

  registerWebSocket(tenantId: string, connection: any) {
    this.websocketConnections.set(tenantId, connection);
    this.logger.log(`WebSocket registered for tenant: ${tenantId}`);
  }

  unregisterWebSocket(tenantId: string) {
    this.websocketConnections.delete(tenantId);
    this.logger.log(`WebSocket unregistered for tenant: ${tenantId}`);
  }

  async collectFromMaps(tenantId: string, params: {
    searchQuery: string;
    location?: string;
    maxResults: number;
  }): Promise<GoogleMapsLead[]> {
    try {
      this.logger.log(`Collecting Google Maps leads for tenant ${tenantId}: ${params.searchQuery}`);

      const connection = this.websocketConnections.get(tenantId);
      if (!connection) {
        throw new Error('No active Chrome extension connection for this tenant. Please ensure the extension is installed and logged in.');
      }

      // Send command to extension via WebSocket
      const command = {
        type: 'COLLECT_MAPS_LEADS',
        payload: params,
        requestId: `maps_${Date.now()}`,
      };

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Google Maps collection timed out after 5 minutes'));
        }, 300000); // 5 minutes

        // Set up listener for response
        const responseHandler = (data: any) => {
          if (data.requestId === command.requestId) {
            clearTimeout(timeout);
            connection.off('maps-response', responseHandler);

            if (data.error) {
              reject(new Error(data.error));
            } else {
              this.logger.log(`Collected ${data.leads.length} leads from Google Maps`);
              resolve(data.leads);
            }
          }
        };

        connection.on('maps-response', responseHandler);
        connection.send(JSON.stringify(command));
      });
    } catch (error) {
      this.logger.error(`Failed to collect Google Maps leads: ${error.message}`, error.stack);
      throw error;
    }
  }

  async parseCsvLeads(csvContent: string): Promise<GoogleMapsLead[]> {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return [];
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const leads: GoogleMapsLead[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const lead: any = {};

        headers.forEach((header, index) => {
          const value = values[index];
          if (value) {
            // Map CSV columns to lead properties
            switch (header.toLowerCase()) {
              case 'name':
              case 'business name':
                lead.name = value;
                break;
              case 'address':
              case 'location':
                lead.address = value;
                break;
              case 'phone':
              case 'phone number':
                lead.phone = value;
                break;
              case 'website':
              case 'url':
                lead.website = value;
                break;
              case 'rating':
                lead.rating = parseFloat(value);
                break;
              case 'reviews':
              case 'review count':
                lead.reviews = parseInt(value);
                break;
              case 'category':
              case 'type':
                lead.category = value;
                break;
              case 'place id':
              case 'placeid':
                lead.placeId = value;
                break;
            }
          }
        });

        if (lead.name) {
          leads.push(lead);
        }
      }

      this.logger.log(`Parsed ${leads.length} leads from CSV`);
      return leads;
    } catch (error) {
      this.logger.error(`Failed to parse CSV: ${error.message}`, error.stack);
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }
}
