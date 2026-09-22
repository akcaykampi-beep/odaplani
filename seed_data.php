<?php
/**
 * OdaMatik - Başlangıç (örnek) verisi
 * Orijinal görseldeki oda yerleşim planından üretilmiştir.
 * Tablolar boşken db.php tarafından bir kez yüklenir.
 */
return [
    'rooms' => [
        // ÖN BLOK KIRMIZI ODA PLANI (1 - 7)
        ['no'=>1,'block'=>'ÖN BLOK KIRMIZI ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Kaya Ailesi','guests'=>['Umut Kaya','Hayriye Kaya','Yalçın Kaya'],'notes'=>'Ankara Kafilesi'],
        ['no'=>2,'block'=>'ÖN BLOK KIRMIZI ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Çelebi Ailesi','guests'=>['Zeynep Çelebi','Murat Çelebi','Yusuf Çelebi'],'notes'=>''],
        ['no'=>3,'block'=>'ÖN BLOK KIRMIZI ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Sağancı Grubu','guests'=>['Edanur Sağancı','Elif Sağancı','Ömer Yıldız'],'notes'=>''],
        ['no'=>4,'block'=>'ÖN BLOK KIRMIZI ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Yurt Ailesi','guests'=>['Cemile Derya Yurt','Ümmühan Yurt','Ali Yurt'],'notes'=>''],
        ['no'=>5,'block'=>'ÖN BLOK KIRMIZI ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Danışan Ailesi','guests'=>['Seyfullah Danışan','Zeynep Danışan','Semiha Danışan'],'notes'=>''],
        ['no'=>6,'block'=>'ÖN BLOK KIRMIZI ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Parlak Grubu','guests'=>['Suna Canpolat','Leyla Parlak','Gülben Parlak'],'notes'=>''],
        ['no'=>7,'block'=>'ÖN BLOK KIRMIZI ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Ayhan Ailesi','guests'=>['İpek Ayhan','Neslihan Ayhan','Güven Ayhan'],'notes'=>''],

        // ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI (8 - 14)
        ['no'=>8,'block'=>'ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI','capacity'=>4,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Kalav Ailesi','guests'=>['Duru Kalav','Songül Kalav','Onur Kalav','Deha Ege Kalav'],'notes'=>'Engelli Girişi'],
        ['no'=>9,'block'=>'ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI','capacity'=>4,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Çalışkan Grubu','guests'=>['Hatice Çalışkan','Müjgan','Gülçin Albayrak','Gülşen Saydam'],'notes'=>''],
        ['no'=>10,'block'=>'ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI','capacity'=>3,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Barut Ailesi','guests'=>['Fadime Barut','Dursun Barut','Erkan Barut'],'notes'=>''],
        ['no'=>11,'block'=>'ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI','capacity'=>4,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Polat Ailesi','guests'=>['Pınar Yaren Polat','Tuğba Polat','Murat Polat','Bahar Polat'],'notes'=>''],
        ['no'=>12,'block'=>'ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI','capacity'=>2,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Destan Ailesi','guests'=>['Kazım Destan','Hanım Destan'],'notes'=>''],
        ['no'=>13,'block'=>'ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI','capacity'=>3,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Demiröz Ailesi','guests'=>['Ayşenur Demiröz','Berat Eren Demiröz','Kibar Demiröz'],'notes'=>''],
        ['no'=>14,'block'=>'ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI','capacity'=>3,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>''],

        // PEMBE BLOK ODA PLANI ENGELLİLER İÇİN (15 - 21)
        ['no'=>15,'block'=>'PEMBE BLOK ODA PLANI ENGELLİLER İÇİN','capacity'=>3,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Eylen Ailesi','guests'=>['Yavuz Eylen','Ercan Eylen','Sırma Eylen'],'notes'=>''],
        ['no'=>16,'block'=>'PEMBE BLOK ODA PLANI ENGELLİLER İÇİN','capacity'=>4,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'İnal & Şahin','guests'=>['Garip İnal','Fatmaana İnal','Ömer Şahin','Leman Bostancı'],'notes'=>''],
        ['no'=>17,'block'=>'PEMBE BLOK ODA PLANI ENGELLİLER İÇİN','capacity'=>4,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Güngör & Işık','guests'=>['Kadir Serkan Güngör','Döndü Güngör','Fatma Işık','Gökçe Işık'],'notes'=>''],
        ['no'=>18,'block'=>'PEMBE BLOK ODA PLANI ENGELLİLER İÇİN','capacity'=>4,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Han Ailesi','guests'=>['Hasan Han','İsa Han','Sevgi Han','Fatmanur Han'],'notes'=>''],
        ['no'=>19,'block'=>'PEMBE BLOK ODA PLANI ENGELLİLER İÇİN','capacity'=>4,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Karaelli Ailesi','guests'=>['Selim Karaelli','Berat Şahin Karaelli','Fatma Gür Karaelli','Ümmühan Karaelli'],'notes'=>''],
        ['no'=>20,'block'=>'PEMBE BLOK ODA PLANI ENGELLİLER İÇİN','capacity'=>4,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Göbütoğlu Ailesi','guests'=>['Neslihan Sakarya Göbütoğlu','Kamil Göbütoğlu','Umut Çınar Göbütoğlu','Sıra Çınar Göbütoğlu'],'notes'=>''],
        ['no'=>21,'block'=>'PEMBE BLOK ODA PLANI ENGELLİLER İÇİN','capacity'=>3,'hasRamp'=>true,'isStaff'=>false,'guestGroup'=>'Aslan Ailesi','guests'=>['Ercan Aslan','Emir Sıtkı Aslan','Yeliz Aslan'],'notes'=>''],

        // 2. SIRA LACİVERT BLOK ODA PLANI (22 - 25)
        ['no'=>22,'block'=>'2. SIRA LACİVERT BLOK ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Bakaç & Yılmaz','guests'=>['Filiz Bakaç','Hafize Yılmaz','Filiz Esenyol'],'notes'=>''],
        ['no'=>23,'block'=>'2. SIRA LACİVERT BLOK ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Demirtaş Ailesi','guests'=>['Gamze Demirtaş','İbrahim Demirtaş','Durkadın Demirtaş'],'notes'=>''],
        ['no'=>24,'block'=>'2. SIRA LACİVERT BLOK ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Ünver Ailesi','guests'=>['Cemal Ünver','Deniz Ünver','Altun Ünver'],'notes'=>''],
        ['no'=>25,'block'=>'2. SIRA LACİVERT BLOK ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Kuzu Ailesi','guests'=>['Defne Kuzu','Güldane Kuzu','Atalay Kuzu'],'notes'=>''],

        // 3. SIRA SARI BLOK ODA PLANI (26 - 29)
        ['no'=>26,'block'=>'3. SIRA SARI BLOK ODA PLANI','capacity'=>5,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Aydoğdu & İpek','guests'=>['Sultan Aydoğdu','Müge Aydoğdu','Döndü Türk','Nevin İpek','Sevim Doğan'],'notes'=>'5 Kişilik Geniş Aile'],
        ['no'=>27,'block'=>'3. SIRA SARI BLOK ODA PLANI','capacity'=>3,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Aktaşlı Ailesi','guests'=>['Mümtaz Aktaşlı','Nergül Aktaşlı','Beren Aktaşlı'],'notes'=>''],
        ['no'=>28,'block'=>'3. SIRA SARI BLOK ODA PLANI','capacity'=>5,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Toksoy Ailesi','guests'=>['Rojda Toksoy','Narin Toksoy','Nisa Toksoy','Ela Toksoy','Remziye Toksoy'],'notes'=>''],
        ['no'=>29,'block'=>'3. SIRA SARI BLOK ODA PLANI','capacity'=>5,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Yalçın & Örs Grubu','guests'=>['Nigar Hikmet Yalçın','Elif Yalçın','Ayşegül Örs','Buket Örs','Serkan Özerol'],'notes'=>''],

        // İKİ KATLI KIRMIZI ALT KAT (30 - 36)
        ['no'=>30,'block'=>'İKİ KATLI KIRMIZI ALT KAT','capacity'=>5,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Kale & Doğan','guests'=>['Başak Kale','Müzeyyen Uğurlu','Zühal Kale','Pelin Doğan','Hatice Kübra Doğan'],'notes'=>''],
        ['no'=>31,'block'=>'İKİ KATLI KIRMIZI ALT KAT','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Şimşek Ailesi','guests'=>['Hasan Şimşek','Ümmügülsüm Şimşek'],'notes'=>''],
        ['no'=>32,'block'=>'İKİ KATLI KIRMIZI ALT KAT','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Aslan Grubu','guests'=>['İbrahim Aslan'],'notes'=>''],
        ['no'=>33,'block'=>'İKİ KATLI KIRMIZI ALT KAT','capacity'=>4,'hasRamp'=>false,'isStaff'=>true,'guestGroup'=>'Nöbetçi Personel','guests'=>['Personel Yatakhanesi 1'],'notes'=>'Görevli Odası'],
        ['no'=>34,'block'=>'İKİ KATLI KIRMIZI ALT KAT','capacity'=>4,'hasRamp'=>false,'isStaff'=>true,'guestGroup'=>'Nöbetçi Personel','guests'=>['Personel Yatakhanesi 2'],'notes'=>'Görevli Odası'],
        ['no'=>35,'block'=>'İKİ KATLI KIRMIZI ALT KAT','capacity'=>4,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Ermiş & Çeviren','guests'=>['Hasan Hüseyin Ermiş','Aslan Gözübüyük','Mustafa Çeviren','Mehmet Eren'],'notes'=>''],
        ['no'=>36,'block'=>'İKİ KATLI KIRMIZI ALT KAT','capacity'=>4,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Eren & Gözübüyük','guests'=>['Meliha Ermiş','Hülya Gözübüyük','Fatma Eren','Mahiye Çeviren'],'notes'=>''],

        // İKİ KATLI KIRMIZI BLOK (37 - 50)
        ['no'=>37,'block'=>'İKİ KATLI KIRMIZI BLOK','capacity'=>5,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>'Yiğit & Kara Ailesi','guests'=>['Ali Yiğit','Gülperi Yiğit','Ebru Yiğit','Ali Asker Kara','Gülsüm Kara'],'notes'=>''],
        // VIP ODALAR (44 - 54) : vip alt 1-5, vip alt 7-8, vip 1-4 — hepsi tek blok altında
        ['no'=>44,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP ALT 1'],
        ['no'=>45,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP ALT 2'],
        ['no'=>46,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP ALT 3'],
        ['no'=>47,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP ALT 4'],
        ['no'=>48,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP ALT 5'],
        ['no'=>49,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP ALT 7'],
        ['no'=>50,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP ALT 8'],
        ['no'=>51,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP 1'],
        ['no'=>52,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP 2'],
        ['no'=>53,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP 3'],
        ['no'=>54,'block'=>'VIP ODALAR','capacity'=>2,'hasRamp'=>false,'isStaff'=>false,'guestGroup'=>null,'guests'=>[],'notes'=>'VIP 4'],
    ],

    'waiting' => [
        ['title'=>'Aydın Ailesi','count'=>4,'names'=>['Murat Aydın','Selin Aydın','Kaan Aydın','Deniz Aydın'],'needsRamp'=>false,'notes'=>'Ankara Garından geldiler'],
        ['title'=>'Çetin Grubu','count'=>3,'names'=>['Hüseyin Çetin','Ahmet Çetin','Semra Çetin'],'needsRamp'=>true,'notes'=>'Tekerlekli sandalye ihtiyacı var'],
    ],
];
