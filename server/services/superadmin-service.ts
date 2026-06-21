import express from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { TenantModel, UserModel, ProductModel, BillModel } from '../db.js';
import { AuthRequest, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get overall Super Admin system-wide metrics
router.get('/stats', requireSuperAdmin as any, async (req: AuthRequest, res) => {
  try {
    const [totalTenants, totalUsers, totalBills, totalProducts] = await Promise.all([
      TenantModel.countDocuments({ id: { $ne: 'super-admin-tenant' } }),
      UserModel.countDocuments({ tenantId: { $ne: 'super-admin-tenant' } }),
      BillModel.countDocuments(),
      ProductModel.countDocuments()
    ]);

    const activeTenants = await TenantModel.countDocuments({ 
      id: { $ne: 'super-admin-tenant' }, 
      status: { $ne: 'suspended' } 
    });

    const suspendedTenants = await TenantModel.countDocuments({ 
      id: { $ne: 'super-admin-tenant' }, 
      status: 'suspended' 
    });

    res.json({
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      totalBills,
      totalProducts
    });
  } catch (error: any) {
    console.error('Superadmin stats calculation error:', error);
    res.status(500).json({ message: 'Internal Server Error calculating metrics' });
  }
});

// List all registered business tenants with member/activity telemetry
router.get('/tenants', requireSuperAdmin as any, async (req: AuthRequest, res) => {
  try {
    const tenants = await TenantModel.find({ id: { $ne: 'super-admin-tenant' } }).lean();
    
    const enrichedTenants = await Promise.all(tenants.map(async (tenant) => {
      // Fetch stats for each tenant
      const [membersCount, productsCount, billsCount, primaryOwner] = await Promise.all([
        UserModel.countDocuments({ tenantId: tenant.id }),
        ProductModel.countDocuments({ tenantId: tenant.id }),
        BillModel.countDocuments({ tenantId: tenant.id }),
        UserModel.findOne({ tenantId: tenant.id, role: 'admin' }).lean()
      ]);

      return {
        ...tenant,
        membersCount,
        productsCount,
        billsCount,
        ownerName: primaryOwner ? primaryOwner.name : 'Unknown Owner',
        ownerEmail: primaryOwner ? primaryOwner.email : 'Unknown Email'
      };
    }));

    res.json(enrichedTenants);
  } catch (error: any) {
    console.error('Superadmin tenants fetch error:', error);
    res.status(500).json({ message: 'Internal Server Error retrieving Tenants logs' });
  }
});

// Toggle suspension / access state of a specific tenant
router.put('/tenants/:tenantId/status', requireSuperAdmin as any, async (req: AuthRequest, res) => {
  const { tenantId } = req.params;
  const { status } = req.body; // 'active' | 'suspended'

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: "Invalid status state. Must be 'active' or 'suspended'." });
  }

  try {
    if (tenantId === 'super-admin-tenant') {
      return res.status(400).json({ message: 'Cannot lock the Super Admin Organization.' });
    }

    const tenant = await TenantModel.findOne({ id: tenantId });
    if (!tenant) {
      return res.status(444).json({ message: 'Tenant not found.' });
    }

    tenant.status = status;
    await tenant.save();

    res.json({ message: `Tenant status updated to ${status} successfully.`, tenant });
  } catch (error: any) {
    console.error('Tenant status update error:', error);
    res.status(500).json({ message: 'Internal Server Error updating tenant status.' });
  }
});

// Add another super administrator credentials manually
router.post('/create-superadmin', requireSuperAdmin as any, async (req: AuthRequest, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password properties are required.' });
  }

  try {
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this login email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = nanoid();
    const tenantId = 'super-admin-tenant'; // Belong to super admin workspace

    const newUser = await UserModel.create({
      id: userId,
      name,
      email,
      passwordHash,
      tenantId,
      role: 'super_admin'
    });

    res.json({ message: `New Super Admin '${name}' created successfully!`, userId: newUser.id });
  } catch (error: any) {
    console.error('Create super admin error:', error);
    res.status(500).json({ message: 'Internal Server Error creating Super Admin.' });
  }
});

// Create a new shop (Tenant) and register its primary owner user
router.post('/tenants', requireSuperAdmin as any, async (req: AuthRequest, res) => {
  const { shopName, slug, ownerName, ownerEmail, ownerPassword, state, gstin } = req.body;

  if (!shopName || !ownerName || !ownerEmail || !ownerPassword) {
    return res.status(400).json({ message: 'Shop Name, Owner Name, Email, and Password are required.' });
  }

  try {
    const existingUser = await UserModel.findOne({ email: ownerEmail });
    if (existingUser) {
      return res.status(400).json({ message: `A user with email '${ownerEmail}' already exists.` });
    }

    const tenantId = nanoid();
    const userId = nanoid();
    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    // Compute slug if not provided, or normalize
    let finalSlug = slug || shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!finalSlug) {
      finalSlug = 'shop-' + nanoid(6);
    }

    const existingTenant = await TenantModel.findOne({ slug: finalSlug });
    if (existingTenant) {
      finalSlug = `${finalSlug}-${nanoid(4)}`;
    }

    const tenant = await TenantModel.create({
      id: tenantId,
      shopName,
      slug: finalSlug,
      ownerId: userId,
      state,
      gstin,
      status: 'active'
    });

    await UserModel.create({
      id: userId,
      name: ownerName,
      email: ownerEmail,
      passwordHash,
      tenantId,
      role: 'admin'
    });

    res.json({ message: `Shop '${shopName}' created successfully! Owner admin registered with email '${ownerEmail}'.`, tenantId });
  } catch (error: any) {
    console.error('Create tenant error:', error);
    res.status(500).json({ message: 'Internal Server Error while creating the shop.' });
  }
});

// Edit existing shop details and reset/update owner details (name, email, password)
router.put('/tenants/:tenantId', requireSuperAdmin as any, async (req: AuthRequest, res) => {
  const { tenantId } = req.params;
  const { shopName, ownerName, ownerEmail, ownerPassword, gstin, state } = req.body;

  try {
    if (tenantId === 'super-admin-tenant') {
      return res.status(400).json({ message: 'Cannot edit core Super Admin Organization details.' });
    }

    const tenant = await TenantModel.findOne({ id: tenantId });
    if (!tenant) {
      return res.status(444).json({ message: 'Tenant not found.' });
    }

    if (shopName) {
      tenant.shopName = shopName;
    }
    if (gstin !== undefined) {
      tenant.gstin = gstin;
    }
    if (state !== undefined) {
      tenant.state = state;
    }

    await tenant.save();

    // Fetch primary admin of this tenant
    const owner = await UserModel.findOne({ tenantId, role: 'admin' });
    if (owner) {
      if (ownerName) owner.name = ownerName;
      
      if (ownerEmail && ownerEmail !== owner.email) {
        // Double check uniqueness of new email
        const userWithEmail = await UserModel.findOne({ email: ownerEmail });
        if (userWithEmail && userWithEmail.id !== owner.id) {
          return res.status(400).json({ message: `Another user with email '${ownerEmail}' already exists.` });
        }
        owner.email = ownerEmail;
      }

      if (ownerPassword) {
        owner.passwordHash = await bcrypt.hash(ownerPassword, 10);
      }

      await owner.save();
    }

    res.json({ message: 'Shop details and primary owner administrative credentials updated successfully!', tenant });
  } catch (error: any) {
    console.error('Update tenant error:', error);
    res.status(500).json({ message: 'Internal Server Error while updating the shop.' });
  }
});

export default router;
