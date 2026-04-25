export const isAdmin = async (request, reply) => {
  const session = request.session;
  
  if (!session.adminId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
};

export const setAdminSession = (request, adminId) => {
  request.session.adminId = adminId;
  request.session.adminLoginTime = Date.now();
};

export const clearAdminSession = (request) => {
  delete request.session.adminId;
  delete request.session.adminLoginTime;
};

export const isAdminLoggedIn = (request) => {
  return !!request.session.adminId;
};

export const verifyAdminCredentials = (login, password) => {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername) {
    console.error('ADMIN_USERNAME environment variable is not set');
    throw new Error('ADMIN_USERNAME not set in environment');
  }
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set');
    throw new Error('ADMIN_PASSWORD not set in environment');
  }
  return login === adminUsername && password === adminPassword;
};

export const verifyAdminPassword = (password) => {
  return verifyAdminCredentials(process.env.ADMIN_USERNAME, password);
};
