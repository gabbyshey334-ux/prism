import apiClient from './apiClient';
export const prism = {
  auth: apiClient.auth,
  functions: apiClient.functions,
  entities: apiClient.entities,
  integrations: apiClient.integrations,
  agents: apiClient.agents
};
export default prism;