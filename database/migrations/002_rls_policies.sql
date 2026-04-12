-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweep_batches ENABLE ROW LEVEL SECURITY;

-- profiles: read all authenticated, update own, insert own
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- merchant_escrow: owner only
CREATE POLICY "escrow_owner" ON merchant_escrow
  FOR ALL USING (auth.uid() = merchant_id) WITH CHECK (auth.uid() = merchant_id);

-- products: read active or owner, write owner
CREATE POLICY "products_select_active_or_owner" ON products
  FOR SELECT USING (is_active = TRUE OR merchant_id = auth.uid());
CREATE POLICY "products_owner_write" ON products
  FOR INSERT WITH CHECK (merchant_id = auth.uid());
CREATE POLICY "products_owner_update" ON products
  FOR UPDATE USING (merchant_id = auth.uid());
CREATE POLICY "products_owner_delete" ON products
  FOR DELETE USING (merchant_id = auth.uid());

-- affiliate_links: affiliate or merchant who owns product
CREATE POLICY "links_select_owner_or_merchant" ON affiliate_links
  FOR SELECT USING (
    affiliate_id = auth.uid()
    OR product_id IN (SELECT id FROM products WHERE merchant_id = auth.uid())
  );
CREATE POLICY "links_owner_write" ON affiliate_links
  FOR INSERT WITH CHECK (affiliate_id = auth.uid());
CREATE POLICY "links_owner_update" ON affiliate_links
  FOR UPDATE USING (affiliate_id = auth.uid());
CREATE POLICY "links_owner_delete" ON affiliate_links
  FOR DELETE USING (affiliate_id = auth.uid());

-- click_events: affiliate can read own clicks
CREATE POLICY "clicks_select_affiliate" ON click_events
  FOR SELECT USING (
    link_id IN (SELECT id FROM affiliate_links WHERE affiliate_id = auth.uid())
  );
CREATE POLICY "clicks_insert_public" ON click_events
  FOR INSERT WITH CHECK (TRUE);

-- conversions: affiliate or merchant
CREATE POLICY "conversions_select_owner" ON conversions
  FOR SELECT USING (affiliate_id = auth.uid() OR merchant_id = auth.uid());
CREATE POLICY "conversions_insert_public" ON conversions
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "conversions_update_merchant" ON conversions
  FOR UPDATE USING (merchant_id = auth.uid());

-- user_achievements: user only
CREATE POLICY "achievements_owner" ON user_achievements
  FOR SELECT USING (user_id = auth.uid());

-- admin check helper
CREATE POLICY "admin_audit_admin_only" ON admin_audit_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- receipts: recipient or admin
CREATE POLICY "receipts_recipient_or_admin" ON official_receipts
  FOR SELECT USING (
    recipient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- deposit_requests: merchant own or admin
CREATE POLICY "deposit_select_owner_or_admin" ON deposit_requests
  FOR SELECT USING (
    merchant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "deposit_insert_owner" ON deposit_requests
  FOR INSERT WITH CHECK (merchant_id = auth.uid());
CREATE POLICY "deposit_update_admin" ON deposit_requests
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- payouts: affiliate own or admin
CREATE POLICY "payout_select_owner_or_admin" ON payouts
  FOR SELECT USING (
    affiliate_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "payout_insert_admin" ON payouts
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- sweep batches: admin only
CREATE POLICY "sweep_admin_only" ON sweep_batches
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
