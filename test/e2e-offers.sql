-- Made-up offers for the Playwright tests of Veckans erbjudanden, sorted already and valid long
-- after the tests run. Never a real store's offers.
UPDATE offer_chain SET enabled = 1, store_id = '9001', store_name = 'Exempelbutiken',
	fetched_at = '2030-01-01T05:00:00Z' WHERE chain IN ('ica', 'willys');
INSERT INTO offer (chain, name, price, compare_price, member, valid_from, valid_to, ingredient) VALUES
	('ica', 'Kycklingfilé', '99 kr/kg', '', 1, NULL, '2099-12-31', 'kycklingfilé'),
	('willys', 'Laxfilé', '129 kr/kg', '', 0, NULL, '2099-12-31', 'laxfilé'),
	('willys', 'Nötfärs 12 %', '2 för 89 kr', 'jfr 89 kr/kg', 0, NULL, '2099-12-31', 'nötfärs'),
	('ica', 'Läsk', '2 för 30 kr', '', 0, NULL, '2099-12-31', '');
