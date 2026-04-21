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

export const verifyAdminPassword = (password) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set');
    throw new Error('ADMIN_PASSWORD not set in environment');
  }
  console.log('Password length received:', password ? password.length : 'null/undefined');
  console.log('ADMIN_PASSWORD length configured:', adminPassword.length);
  const isValid = password === adminPassword;
  console.log('Password verification result:', isValid);
  return isValid;
};
