export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
      return;
    }
    next();
  };
}

export const requireAdmin = authorizeRoles('admin');
export const requireFrontDesk = authorizeRoles('front_desk', 'admin');
export const requireClinician = authorizeRoles('clinician');
export const requirePatient = authorizeRoles('patient');
