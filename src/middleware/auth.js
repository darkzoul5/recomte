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
    throw new Error('ADMIN_PASSWORD not set in environment');
  }
  return password === adminPassword;
};
