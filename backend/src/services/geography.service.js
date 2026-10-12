const UGANDA_COUNTRY_NAME = "UGANDA";

const CENTRAL_SUBREGION_DISTRICTS = {
  Kampala: ["Kampala"],
  "Buganda North": [
    "Buikwe",
    "Buvuma",
    "Kassanda",
    "Kayunga",
    "Kiboga",
    "Kyankwanzi",
    "Luwero",
    "Mityana",
    "Mubende",
    "Mukono",
    "Nakaseke",
    "Nakasongola"
  ],
  "Buganda South": [
    "Bukomansimbi",
    "Butambala",
    "Gomba",
    "Kalangala",
    "Kalungu",
    "Kyotera",
    "Lwengo",
    "Lyantonde",
    "Masaka",
    "Masaka City",
    "Mpigi",
    "Rakai",
    "Sembabule",
    "Wakiso"
  ]
};

const NORTHERN_SUBREGION_DISTRICTS = {
  Acholi: ["Agago", "Amuru", "Gulu", "Gulu City", "Kitgum", "Lamwo", "Nwoya", "Omoro", "Pader"],
  Lango: ["Alebtong", "Amolatar", "Apac", "Dokolo", "Kole", "Kwania", "Lira", "Lira City", "Otuke", "Oyam"],
  Karamoja: ["Abim", "Amudat", "Kaabong", "Karenga", "Kotido", "Moroto", "Nabilatuk", "Nakapiripirit", "Napak"],
  "West Nile": [
    "Adjumani",
    "Arua",
    "Arua City",
    "Koboko",
    "Madi-Okollo",
    "Maracha",
    "Moyo",
    "Nebbi",
    "Obongi",
    "Pakwach",
    "Terego",
    "Yumbe",
    "Zombo"
  ]
};

const EASTERN_SUBREGION_DISTRICTS = {
  Busoga: ["Bugiri", "Bugweri", "Buyende", "Iganga", "Jinja", "Jinja City", "Kaliro", "Kamuli", "Luuka", "Mayuge", "Namayingo", "Namutumba"],
  Bukedi: ["Budaka", "Busia", "Butaleja", "Butebo", "Kibuku", "Pallisa", "Tororo"],
  Elgon: ["Bududa", "Bukwo", "Bulambuli", "Kapchorwa", "Kween", "Manafwa", "Mbale", "Mbale City", "Namisindwa", "Sironko"],
  Teso: ["Amuria", "Bukedea", "Kaberamaido", "Kalaki", "Kapelebyong", "Katakwi", "Kumi", "Ngora", "Serere", "Soroti", "Soroti City"]
};

const WESTERN_SUBREGION_DISTRICTS = {
  Bunyoro: ["Buliisa", "Hoima", "Hoima City", "Kagadi", "Kakumiro", "Kibaale", "Kikuube", "Kiryandongo", "Masindi"],
  Toro: ["Bundibugyo", "Bunyangabu", "Fort Portal City", "Kabarole", "Kamwenge", "Kasese", "Kitagwenda", "Kyegegwa", "Kyenjojo", "Ntoroko"],
  Ankole: ["Buhweju", "Bushenyi", "Ibanda", "Isingiro", "Kiruhura", "Mbarara", "Mbarara City", "Mitooma", "Ntungamo", "Rubirizi", "Rwampara", "Sheema"],
  Kigezi: ["Kabale", "Kanungu", "Kisoro", "Rubanda", "Rukiga", "Rukungiri"]
};

const CENTRAL_REGION_DATASET = `
LUWERO | Bamunanika County | Bamunanika Subcounty
LUWERO | Bamunanika County | Busiika Town Council
LUWERO | Bamunanika County | Kalagala Subcounty
LUWERO | Bamunanika County | Kamira Subcounty
LUWERO | Bamunanika County | Kamira Town Council
LUWERO | Bamunanika County | Kikyusa Subcounty
LUWERO | Bamunanika County | Kikyusa Town Council
LUWERO | Bamunanika County | Zirobwe Subcounty
LUWERO | Bamunanika County | Zirobwe Town Council
KAYUNGA | Bbale County | Bbaale Subcounty
KAYUNGA | Bbale County | Galiraya Subcounty
KAYUNGA | Bbale County | Kayonza Subcounty
KAYUNGA | Bbale County | Kitimbwa Subcounty
KAYUNGA | Bbale County | Kitimbwa Town Council
NAKASONGOLA | Budyebo County | Lwabiyata Subcounty
NAKASONGOLA | Budyebo County | Lwampanga Subcounty
NAKASONGOLA | Budyebo County | Lwampanga Town Council
NAKASONGOLA | Budyebo County | Migeera Town Council
NAKASONGOLA | Budyebo County | Nabiswera Subcounty
NAKASONGOLA | Budyebo County | Nakitoma Subcounty
BUIKWE | Buikwe County | Buikwe Subcounty
BUIKWE | Buikwe County | Buikwe Town Council
BUIKWE | Buikwe County | Kiyindi Town Council
BUIKWE | Buikwe County | Najja Subcounty
BUIKWE | Buikwe County | Ngogwe Subcounty
BUIKWE | Buikwe County | Nkokonjeru Town Council
BUIKWE | Buikwe County | Ssi Subcounty
KALANGALA | Bujumba County | Bujumba Subcounty
KALANGALA | Bujumba County | Kalangala Town Council
KALANGALA | Bujumba County | Mugoye Subcounty
BUKOMANSIMBI | Bukomansimbi North County | Bigasa Subcounty
BUKOMANSIMBI | Bukomansimbi North County | Bukango Subcounty
BUKOMANSIMBI | Bukomansimbi North County | Bukomansimbi Town Council
BUKOMANSIMBI | Bukomansimbi North County | Kagologolo Town Council
BUKOMANSIMBI | Bukomansimbi North County | Kigangazzi Town Council
BUKOMANSIMBI | Bukomansimbi North County | Kitanda Subcounty
BUKOMANSIMBI | Bukomansimbi South County | Butenga Subcounty
BUKOMANSIMBI | Bukomansimbi South County | Butenga Town Council
BUKOMANSIMBI | Bukomansimbi South County | Kibinge Subcounty
LWENGO | Bukoto County | Katovu Town Council
LWENGO | Bukoto County | Kingo Subcounty
LWENGO | Bukoto County | Kinoni Town Council
LWENGO | Bukoto County | Kisekka Subcounty
LWENGO | Bukoto County | Kyazanga Subcounty
LWENGO | Bukoto County | Kyazanga Town Council
LWENGO | Bukoto County | Lwengo Subcounty
LWENGO | Bukoto County | Lwengo Town Council
LWENGO | Bukoto County | Malongo Subcounty
LWENGO | Bukoto County | Ndagwe Subcounty
MASAKA | Bukoto County | Bukakata Subcounty
MASAKA | Bukoto County | Buwunga Subcounty
MASAKA | Bukoto County | Kyanamukaka Subcounty
MASAKA | Bukoto County | Kyesiiga Subcounty
KASSANDA | Bukuya County | Bukuya Subcounty
KASSANDA | Bukuya County | Bukuya Town Council
KASSANDA | Bukuya County | Kijjuna Subcounty
KASSANDA | Bukuya County | Kitumbi Subcounty
KASSANDA | Bukuya County | Makokoto Subcounty
KASSANDA | Bukuya County | Mbirizi Subcounty
WAKISO | Busiro County | Bussi Subcounty
WAKISO | Busiro County | Kajjansi Town Council
WAKISO | Busiro County | Kakiri Subcounty
WAKISO | Busiro County | Kakiri Town Council
WAKISO | Busiro County | Kasanje Town Council
WAKISO | Busiro County | Katabi Town Council
WAKISO | Busiro County | Kyengera Town Council
WAKISO | Busiro County | Masuliita Subcounty
WAKISO | Busiro County | Masuliita Town Council
WAKISO | Busiro County | Mende Subcounty
WAKISO | Busiro County | Namayumba Subcounty
WAKISO | Busiro County | Namayumba Town Council
WAKISO | Busiro County | Wakiso Subcounty
WAKISO | Busiro County | Wakiso Town Council
MITYANA | Busujju County | Bbanda Subcounty
MITYANA | Busujju County | Bbanda Town Council
MITYANA | Busujju County | Butayunja Subcounty
MITYANA | Busujju County | Kakindu Subcounty
MITYANA | Busujju County | Maanyi Subcounty
MITYANA | Busujju County | Malagala Subcounty
MITYANA | Busujju County | Zigoti Town Council
BUTAMBALA | Butambala County | Budde Subcounty
BUTAMBALA | Butambala County | Bulo Subcounty
BUTAMBALA | Butambala County | Gombe Town Council
BUTAMBALA | Butambala County | Kalamba Subcounty
BUTAMBALA | Butambala County | Kalamba Town Council
BUTAMBALA | Butambala County | Kibibi Town Council
BUTAMBALA | Butambala County | Ngando Subcounty
KYANKWANZI | Butemba County | Bananywa Subcounty
KYANKWANZI | Butemba County | Banda Subcounty
KYANKWANZI | Butemba County | Butemba Subcounty
KYANKWANZI | Butemba County | Butemba Town Council
KYANKWANZI | Butemba County | Byerima Subcounty
KYANKWANZI | Butemba County | Kigando Subcounty
KYANKWANZI | Butemba County | Kyankwanzi Subcounty
KYANKWANZI | Butemba County | Kyankwanzi Town Council
KYANKWANZI | Butemba County | Nsambya Subcounty
KYANKWANZI | Butemba County | Ntunda Town Council
BUVUMA | Buvuma Islands County | Bugaya Subcounty
BUVUMA | Buvuma Islands County | Busamuzi Subcounty
BUVUMA | Buvuma Islands County | Buvuma Town Council
BUVUMA | Buvuma Islands County | Buwooya Subcounty
BUVUMA | Buvuma Islands County | Bweema Subcounty
BUVUMA | Buvuma Islands County | Lubya Town Council
BUVUMA | Buvuma Islands County | Lwaje Subcounty
BUVUMA | Buvuma Islands County | Lyabaana Town Council
BUVUMA | Buvuma Islands County | Nairambi Subcounty
MUBENDE | Buwekula County | Butoloogo Subcounty
MUBENDE | Buwekula County | Kiruuma Subcounty
MUBENDE | Buwekula County | Kiyuuni Subcounty
MUBENDE | Buwekula County | Madudu Subcounty
MUBENDE | Buwekula South County | Kalonga Subcounty
MUBENDE | Buwekula South County | Kayebe Subcounty
MUBENDE | Buwekula South County | Kitenga Subcounty
MUBENDE | Buwekula South County | Kyenda Town Council
RAKAI | Buyamba County | Ddwaniro Subcounty
RAKAI | Buyamba County | Kacheera Subcounty
RAKAI | Buyamba County | Kagamba Subcounty
RAKAI | Buyamba County | Kasankala Subcounty
RAKAI | Buyamba County | Lwamaggwa Subcounty
RAKAI | Buyamba County | Lwamagwa Town Council
RAKAI | Buyamba County | Lwentulege Town Council
WAKISO | Entebbe Municipality | Entebbe A Division
WAKISO | Entebbe Municipality | Entebbe B Division
GOMBA | Gomba East County | Kanoni Town Council
GOMBA | Gomba East County | Kyegonza Subcounty
GOMBA | Gomba East County | Mpenja Subcounty
GOMBA | Gomba East County | Ttaba-Bbinzi Subcounty
GOMBA | Gomba West County | Kabulasoke Subcounty
GOMBA | Gomba West County | Kifampa Subcounty
GOMBA | Gomba West County | Kyayi Subcounty
GOMBA | Gomba West County | Maddu Subcounty
GOMBA | Gomba West County | Maddu Town Council
LYANTONDE | Kabula County | Kaliiro Subcounty
LYANTONDE | Kabula County | Kaliiro Town Council
LYANTONDE | Kabula County | Kasagama Subcounty
LYANTONDE | Kabula County | Kinuuka Subcounty
LYANTONDE | Kabula County | Lyakajura Subcounty
LYANTONDE | Kabula County | Lyantonde Subcounty
LYANTONDE | Kabula County | Lyantonde Town Council
LYANTONDE | Kabula County | Mpumudde Subcounty
KYOTERA | Kakuuto County | Kakuuto Subcounty
KYOTERA | Kakuuto County | Kasasa Subcounty
KYOTERA | Kakuuto County | Kasensero Town Council
KYOTERA | Kakuuto County | Kyebe Subcounty
KYOTERA | Kakuuto County | Mutukula Town Council
KYOTERA | Kakuuto County | Nangoma Subcounty
KALUNGU | Kalungu County | Kakulula Subcounty
KALUNGU | Kalungu County | Kalungu Subcounty
KALUNGU | Kalungu County | Kalungu Town Council
KALUNGU | Kalungu County | Kyamulibwa Subcounty
KALUNGU | Kalungu County | Kyamulibwa Town Council
KALUNGU | Kalungu County | Lukaya Town Council
KALUNGU | Kalungu County | Lwabenge Subcounty
KAMPALA | Kampala Central Division | Kampala Central Division
MUBENDE | Kasambya County | Bagezza Subcounty
MUBENDE | Kasambya County | Kasambya Subcounty
MUBENDE | Kasambya County | Kasambya Town Council
MUBENDE | Kasambya County | Kibalinga Subcounty
MUBENDE | Kasambya County | Kigando Subcounty
MUBENDE | Kasambya County | Lubimbiri Subcounty
MUBENDE | Kasambya County | Nabingoola Subcounty
MUBENDE | Kasambya County | Nabingoola Town Council
MUBENDE | Kassanda County | Kalwana Subcounty
MUBENDE | Kassanda County | Kamuli Subcounty
MUBENDE | Kassanda County | Kassanda Subcounty
MUBENDE | Kassanda County | Kassanda Town Council
MUBENDE | Kassanda County | Kiganda Subcounty
MUBENDE | Kassanda County | Kiganda Town Council
MUBENDE | Kassanda County | Manyogaseka Subcounty
MUBENDE | Kassanda County | Myanzi Subcounty
MUBENDE | Kassanda County | Nalutuntu Subcounty
LUWERO | Katikamu County | Bombo Town Council
LUWERO | Katikamu County | Butuntumula Subcounty
LUWERO | Katikamu County | Katikamu Subcounty
LUWERO | Katikamu County | Luwero Town Council
LUWERO | Katikamu County | Luwero Subcounty
LUWERO | Katikamu County | Makulubita Subcounty
LUWERO | Katikamu County | Ndejje Town Council
LUWERO | Katikamu County | Nyimbwa Subcounty
LUWERO | Katikamu County | Wobulenzi Town Council
KAMPALA | Kawempe Division | Kawempe Division
KIBOGA | Kiboga East County | Bukomero Subcounty
KIBOGA | Kiboga East County | Bukomero Town Council
KIBOGA | Kiboga East County | Ddwaniro Subcounty
KIBOGA | Kiboga East County | Kyomya Subcounty
KIBOGA | Kiboga East County | Lwamata Subcounty
KIBOGA | Kiboga East County | Lwamata Town Council
KIBOGA | Kiboga East County | Muwanga Subcounty
KIBOGA | Kiboga East County | Nakasozi Subcounty
KIBOGA | Kiboga West County | Kapeke Subcounty
KIBOGA | Kiboga West County | Kayera Subcounty
KIBOGA | Kiboga West County | Kibiga Subcounty
KIBOGA | Kiboga West County | Kiboga Town Council
KIBOGA | Kiboga West County | Kyekumbya Subcounty
KIBOGA | Kiboga West County | Nkandwa Subcounty
MASAKA CITY | Kimaanya-Kabonera Division | Kimaanya-Kabonera Division
WAKISO | Kira Municipality | Bweyogerere Division
WAKISO | Kira Municipality | Kira Division
WAKISO | Kira Municipality | Namugongo Division
RAKAI | Kooki County | Byakabanda Subcounty
RAKAI | Kooki County | Dyango Town Council
RAKAI | Kooki County | Kibaale Town Council
RAKAI | Kooki County | Kibanda Subcounty
RAKAI | Kooki County | Kifamba Subcounty
RAKAI | Kooki County | Kiziba Subcounty
RAKAI | Kooki County | Kiziba Town Council
RAKAI | Kooki County | Kyalulangira Subcounty
RAKAI | Kooki County | Lwanda Subcounty
RAKAI | Kooki County | Mweruka Town Council
RAKAI | Kooki County | Ntantamuki Town Council
RAKAI | Kooki County | Rakai Town Council
WAKISO | Kyadondo County | Kasangati Town Council
KALANGALA | Kyamuswa County | Bubeke Subcounty
KALANGALA | Kyamuswa County | Bufumira Subcounty
KALANGALA | Kyamuswa County | Kyamuswa Subcounty
KALANGALA | Kyamuswa County | Mazinga Subcounty
KYOTERA | Kyotera County | Kabira Subcounty
KYOTERA | Kyotera County | Kalisizo Subcounty
KYOTERA | Kyotera County | Kalisizo Town Council
KYOTERA | Kyotera County | Kasaali Town Council
KYOTERA | Kyotera County | Kirumba Subcounty
KYOTERA | Kyotera County | Kyotera Town Council
KYOTERA | Kyotera County | Lwankoni Subcounty
KYOTERA | Kyotera County | Nabigasa Subcounty
BUIKWE | Lugazi Municipality | Kawolo Division
BUIKWE | Lugazi Municipality | Lugazi Central Division
BUIKWE | Lugazi Municipality | Najjembe Division
SEMBABULE | Lwemiyaga County | Bulongo Subcounty
SEMBABULE | Lwemiyaga County | Kyeera Subcounty
SEMBABULE | Lwemiyaga County | Lwemiyaga Subcounty
SEMBABULE | Lwemiyaga County | Nabitanga Subcounty
SEMBABULE | Lwemiyaga County | Ntuusi Town Council
KAMPALA | Makindye Division | Makindye Division
WAKISO | Makindye-Ssabagabo Municipality | Bunamwaya Division
WAKISO | Makindye-Ssabagabo Municipality | Masajja Division
WAKISO | Makindye-Ssabagabo Municipality | Ndejje Division
SEMBABULE | Mawogola County | Mateete Subcounty
SEMBABULE | Mawogola County | Mateete Town Council
SEMBABULE | Mawogola County | Mitete Subcounty
SEMBABULE | Mawogola North County | Kawanda Subcounty
SEMBABULE | Mawogola North County | Lugusulu Subcounty
SEMBABULE | Mawogola North County | Mabindo Subcounty
SEMBABULE | Mawogola North County | Mijwala Subcounty
SEMBABULE | Mawogola North County | Mitima Subcounty
SEMBABULE | Mawogola North County | Ssembabule Town Council
SEMBABULE | Mawogola West County | Katwe Subcounty
SEMBABULE | Mawogola West County | Lwebitakuli Subcounty
SEMBABULE | Mawogola West County | Nakasenyi Subcounty
MPIGI | Mawokota County | Buwama Subcounty
MPIGI | Mawokota County | Buwama Town Council
MPIGI | Mawokota County | Kammengo Subcounty
MPIGI | Mawokota County | Kayabwe Town Council
MPIGI | Mawokota County | Kiringente Subcounty
MPIGI | Mawokota County | Kituntu Subcounty
MPIGI | Mawokota County | Mpigi Town Council
MPIGI | Mawokota County | Muduma Subcounty
MPIGI | Mawokota County | Nkozi Subcounty
MITYANA | Mityana Municipality | Busimbi Division
MITYANA | Mityana Municipality | Mityana Central Division
MITYANA | Mityana Municipality | Ttamu Division
MITYANA | Mityana County | Bulera Subcounty
MITYANA | Mityana County | Busunju Town Council
MITYANA | Mityana County | Kalangaalo Subcounty
MITYANA | Mityana County | Kikandwa Subcounty
MITYANA | Mityana County | Namungo Subcounty
MITYANA | Mityana County | Ssekanyonyi Subcounty
MITYANA | Mityana County | Sekanyonyi Town Council
MUBENDE | Mubende Municipality | Mubende East Division
MUBENDE | Mubende Municipality | Mubende South Division
MUBENDE | Mubende Municipality | Mubende West Division
MUKONO | Mukono Municipality | Goma Division
MUKONO | Mukono Municipality | Mukono Central Division
MUKONO | Mukono County | Katosi Town Council
MUKONO | Mukono County | Koome Islands Subcounty
MUKONO | Mukono County | Kyampisi Subcounty
MUKONO | Mukono County | Mpatta Subcounty
MUKONO | Mukono County | Mpunge Subcounty
MUKONO | Mukono County | Nakisunga Subcounty
MUKONO | Mukono County | Nama Subcounty
MUKONO | Mukono County | Ntenjeru-Kisoga Town Council
NAKASEKE | Nakaseke Central County | Kikamulo Subcounty
NAKASEKE | Nakaseke Central County | Kitto Subcounty
NAKASEKE | Nakaseke Central County | Kiwoko Town Council
NAKASEKE | Nakaseke Central County | Nakaseke Butalangu Town Council
NAKASEKE | Nakaseke Central County | Wakyato Subcounty
NAKASEKE | Nakaseke North County | Kinoni Subcounty
NAKASEKE | Nakaseke North County | Kinyogoga Subcounty
NAKASEKE | Nakaseke North County | Ngoma Subcounty
NAKASEKE | Nakaseke North County | Ngoma Town Council
NAKASEKE | Nakaseke South County | Kaasangombe Subcounty
NAKASEKE | Nakaseke South County | Kapeeka Subcounty
NAKASEKE | Nakaseke South County | Nakaseke Subcounty
NAKASEKE | Nakaseke South County | Nakaseke Town Council
NAKASEKE | Nakaseke South County | Semuto Subcounty
NAKASEKE | Nakaseke South County | Semuto Town Council
NAKASONGOLA | Nakasongola County | Kakooge Subcounty
NAKASONGOLA | Nakasongola County | Kakooge Town Council
NAKASONGOLA | Nakasongola County | Kalongo Subcounty
NAKASONGOLA | Nakasongola County | Kalungi Subcounty
NAKASONGOLA | Nakasongola County | Katuugo Town Council
NAKASONGOLA | Nakasongola County | Kazwama Town Council
NAKASONGOLA | Nakasongola County | Mayirikiti Town Council
NAKASONGOLA | Nakasongola County | Nakasongola Town Council
NAKASONGOLA | Nakasongola County | Wabinyonyi Subcounty
KAMPALA | Nakawa Division | Nakawa Division
MUKONO | Nakifuma County | Kasawo Subcounty
MUKONO | Nakifuma County | Kasawo Town Council
MUKONO | Nakifuma County | Kimenyedde Subcounty
MUKONO | Nakifuma County | Nagojje Subcounty
MUKONO | Nakifuma County | Nakifuma-Naggalama Town Council
MUKONO | Nakifuma County | Namataba Town Council
MUKONO | Nakifuma County | Ntunda Subcounty
MUKONO | Nakifuma County | Seeta-Namuganga Subcounty
WAKISO | Nansana Municipality | Busukuma Division
WAKISO | Nansana Municipality | Gombe Division
WAKISO | Nansana Municipality | Nabweru Division
WAKISO | Nansana Municipality | Nansana Division
BUIKWE | Njeru Municipality | Njeru Division
BUIKWE | Njeru Municipality | Nyenga Division
BUIKWE | Njeru Municipality | Wakisi Division
KAYUNGA | Ntenjeru County | Busaana Subcounty
KAYUNGA | Ntenjeru County | Busaana Town Council
KAYUNGA | Ntenjeru County | Kangulumira Subcounty
KAYUNGA | Ntenjeru County | Kangulumira Town Council
KAYUNGA | Ntenjeru County | Kayunga Subcounty
KAYUNGA | Ntenjeru County | Kayunga Town Council
KAYUNGA | Ntenjeru County | Nazigo Subcounty
KAYUNGA | Ntenjeru County | Nazigo Town Council
KYANKWANZI | Ntwetwe County | Gayaza Subcounty
KYANKWANZI | Ntwetwe County | Kiryannongo Subcounty
KYANKWANZI | Ntwetwe County | Kisala Subcounty
KYANKWANZI | Ntwetwe County | Masodde-Kalagi Town Council
KYANKWANZI | Ntwetwe County | Mulagi Subcounty
KYANKWANZI | Ntwetwe County | Muwangi Subcounty
KYANKWANZI | Ntwetwe County | Nkandwa Subcounty
KYANKWANZI | Ntwetwe County | Ntwetwe Subcounty
KYANKWANZI | Ntwetwe County | Ntwetwe Town Council
KYANKWANZI | Ntwetwe County | Wattuba Subcounty
KYANKWANZI | Ntwetwe County | Wattuba Town Council
MASAKA CITY | Nyendo-Mukungwe Division | Nyendo-Mukungwe Division
KAMPALA | Rubaga Division | Rubaga Division
`;

const NORTHERN_REGION_DATASET = `
ADJUMANI | Adjumani East County | Arinyapi Subcounty
ADJUMANI | Adjumani East County | Dzaipi Subcounty
ADJUMANI | Adjumani East County | Itirikwa Subcounty
ADJUMANI | Adjumani East County | Ofua Subcounty
ADJUMANI | Adjumani East County | Pakele Subcounty
ADJUMANI | Adjumani East County | Pakele Town Council
ADJUMANI | Adjumani East County | Refugee Settlement Camps
ADJUMANI | Adjumani West County | Adjumani Town Council
ADJUMANI | Adjumani West County | Adropi Subcounty
ADJUMANI | Adjumani West County | Ciforo Subcounty
ADJUMANI | Adjumani West County | Pachara Subcounty
ADJUMANI | Adjumani West County | Refugee Settlement Camps
ADJUMANI | Adjumani West County | Ukusijoni
AGAGO | Agago County | Adilang Subcounty
AGAGO | Agago County | Adilang Town Council
AGAGO | Agago County | Agago Town Council
AGAGO | Agago County | Ajali Subcounty
AGAGO | Agago County | Kotomor Subcounty
AGAGO | Agago County | Laperebong Subcounty
AGAGO | Agago County | Lokole Subcounty
AGAGO | Agago County | Patongo Subcounty
AGAGO | Agago County | Patongo Town Council
AGAGO | Agago North County | Kalongo Town Council
AGAGO | Agago North County | Kuywee Subcounty
AGAGO | Agago North County | Lai-Mutto Town Council
AGAGO | Agago North County | Lapono Subcounty
AGAGO | Agago North County | Lira Kato Subcounty
AGAGO | Agago North County | Omiya Pacwa Subcounty
AGAGO | Agago North County | Paimol Subcounty
AGAGO | Agago North County | Parabongo Subcounty
AGAGO | Agago North County | Wol Subcounty
AGAGO | Agago North County | Wol Town Council
AGAGO | Agago West County | Agengo Subcounty
AGAGO | Agago West County | Arum Subcounty
AGAGO | Agago West County | Geregere Subcounty
AGAGO | Agago West County | Lamiyo Subcounty
AGAGO | Agago West County | Lira-Palwo Subcounty
AGAGO | Agago West County | Lira-Palwo Town Council
AGAGO | Agago West County | Omot Subcounty
ALEBTONG | Ajuri County | Abako Subcounty
ALEBTONG | Ajuri County | Adwir Subcounty
ALEBTONG | Ajuri County | Amugu Suncounty
ALEBTONG | Ajuri County | Amugu Town Council
ALEBTONG | Ajuri County | Angetta Subcounty
ALEBTONG | Ajuri County | Awei Subcounty
ALEBTONG | Ajuri County | Omoro Subcounty
APAC | Apac Municipality | Agullu Division
APAC | Apac Municipality | Akere Division
APAC | Apac Municipality | Arocha Division
APAC | Apac Municipality | Atik Divission
APAC | Maruzi County | Akokoro Subcounty
APAC | Maruzi County | Akokoro Town Council
APAC | Maruzi County | Apoi Subcounty
APAC | Maruzi County | Ibuje Subcounty
APAC | Maruzi County | Ibuje Town Council
APAC | Maruzi North County | Apac Subcounty
APAC | Maruzi North County | Chegere Subcounty
APAC | Maruzi North County | Te-Boke Subcounty
YUMBE | Aringa County | Bidi Bidi Refugee Camp
YUMBE | Aringa County | Bijo Subcounty
YUMBE | Aringa County | Kululu Subcounty
YUMBE | Aringa County | Kuru Subcounty
YUMBE | Aringa County | Kuru Town Council
YUMBE | Aringa County | Yumbe Town Council
YUMBE | Aringa East County | Apo Subcounty
YUMBE | Aringa East County | Aria Subcounty
YUMBE | Aringa East County | Barakala Town Council
YUMBE | Aringa East County | Bidi Bidi Refugee Camp
YUMBE | Aringa East County | Kochi Subcounty
YUMBE | Aringa East County | Lori Subcounty
YUMBE | Aringa East County | Romogi Subcounty
YUMBE | Aringa North County | Arilo Subcounty
YUMBE | Aringa North County | Kei Subcounty
YUMBE | Aringa North County | Kerwa Subcounty
YUMBE | Aringa North County | Lobe Town Council
YUMBE | Aringa North County | Midigo Subcounty
YUMBE | Aringa North County | Midigo Town Council
YUMBE | Aringa North County | Wandi Subcounty
YUMBE | Aringa South County | Arafa Subcounty
YUMBE | Aringa South County | Ariwa Subcounty
YUMBE | Aringa South County | Bidi Bidi Refugee Camp
YUMBE | Aringa South County | Drajini Subcounty
YUMBE | Aringa South County | Kulikulinga Town Council
YUMBE | Aringa South County | Lodonga Subcounty
YUMBE | Aringa South County | Lodonga Town Council
YUMBE | Aringa South County | Odravu Subcounty
YUMBE | Aringa South County | Odravu West Subcounty
ARUA CITY | Arua Central Division | Arua Central Division
ARUA CITY | Ayivu Division | Ayivu Division
PADER | Aruu County | Awere Subcounty
PADER | Aruu County | Lunyiri Subcounty
PADER | Aruu County | Ogom Subcounty
PADER | Aruu County | Pader Subcounty
PADER | Aruu County | Pader Town Council
PADER | Aruu County | Pukor Subcounty
PADER | Aruu County | Puranga Subcounty
PADER | Aruu County | Puranga Town Council
PADER | Aruu County | Te-Nam Subcounty
PADER | Aruu North County | Acholi-Bur Subcounty
PADER | Aruu North County | Acholi-Bur Town Council
PADER | Aruu North County | Ajan Subcounty
PADER | Aruu North County | Angagura Subcounty
PADER | Aruu North County | Atanga Subcounty
PADER | Aruu North County | Atanga Town Council
PADER | Aruu North County | Bongtiko Subcounty
PADER | Aruu North County | Laguti Subcounty
PADER | Aruu North County | Lapul Subcounty
PADER | Aruu North County | Latanya Subcounty
PADER | Aruu North County | Paiula Subcounty
PADER | Aruu North County | Pajule Subcounty
PADER | Aruu North County | Pajule Town Council
PADER | Aruu North County | Porogali Subcounty
GULU | Aswa County | Awach Subcounty
GULU | Aswa County | Bungatira Subcounty
GULU | Aswa County | Omel Subcounty
GULU | Aswa County | Owalo Subcounty
GULU | Aswa County | Owoo Subcounty
GULU | Aswa County | Paibona Subcounty
GULU | Aswa County | Paicho Subcounty
GULU | Aswa County | Palaro Subcounty
GULU | Aswa County | Patiko Subcounty
GULU | Aswa County | Pukony Subcounty
GULU | Aswa County | Unyama Subcounty
GULU CITY | Bardege-Layibi Division | Bardege Layibi Division
GULU CITY | Laro-Pece Division | Laro-Pece Division
NAPAK | Bokora County | Apeitolim Subcounty
NAPAK | Bokora County | Lokiteded Town Council
NAPAK | Bokora County | Lokopo Subcounty
NAPAK | Bokora County | Lopei Subcounty
NAPAK | Bokora County | Matany Subcounty
NAPAK | Bokora County | Matany Town Council
NAPAK | Bokora County | Poron Subcounty
NAPAK | Bokora East County | Iriiri Subcounty
NAPAK | Bokora East County | Kangole Town Council
NAPAK | Bokora East County | Lorengecora Subcounty
NAPAK | Bokora East County | Lotome Subcounty
NAPAK | Bokora East County | Nabwal Subcounty
NAPAK | Bokora East County | Napak Town Council
NAPAK | Bokora East County | Ngoleriet Subcounty
NAKAPIRIPIRIT | Chekwii County | Kaawach Subcounty
NAKAPIRIPIRIT | Chekwii County | Kakomongole Subcounty
NAKAPIRIPIRIT | Chekwii County | Loregae Subcounty
NAKAPIRIPIRIT | Chekwii County | Loreng Subcounty
NAKAPIRIPIRIT | Chekwii County | Namalu Subcounty
NAKAPIRIPIRIT | Chekwii East County | Lemusui Subcounty
NAKAPIRIPIRIT | Chekwii East County | Moruita Subcounty
NAKAPIRIPIRIT | Chekwii East County | Nakapiripirit Town Council
NAKAPIRIPIRIT | Chekwii East County | Tokora Subcounty
KITGUM | Chua East County | Kiteny Subcounty
KITGUM | Chua East County | Muchwini East Subcounty
KITGUM | Chua East County | Muchwini West Subcounty
KITGUM | Chua East County | Mucwini Subcounty
KITGUM | Chua East County | Namokora Subcounty
KITGUM | Chua East County | Namokora Town Council
KITGUM | Chua East County | Namokora North Subcounty
KITGUM | Chua East County | Omiya-Anyima Subcounty
KITGUM | Chua East County | Omiya-Anyima West Subcounty
KITGUM | Chua East County | Orom Subcounty
KITGUM | Chua East County | Orom East Subcounty
KITGUM | Chua West County | Akwang Subcounty
KITGUM | Chua West County | Kitgum Matidi Town Council
KITGUM | Chua West County | Kitgum Matidi Subcounty
KITGUM | Chua West County | Labongo-Amida Subcounty
KITGUM | Chua West County | Labongo Amida West Subcounty
KITGUM | Chua West County | Labongo Layamo Subcounty
KITGUM | Chua West County | Lagoro Subcounty
KITGUM | Chua West County | Lalano Subcounty
KITGUM | Kitgum Municipality | Kitgum Central Division
KITGUM | Kitgum Municipality | Pager Division
KITGUM | Kitgum Municipality | Pandwong Division
KAABONG | Dodoth East County | Kaabong Town Council
KAABONG | Dodoth East County | Kaabong West Subcounty
KAABONG | Dodoth East County | Kakamar Subcounty
KAABONG | Dodoth East County | Lobongia Subcounty
KAABONG | Dodoth East County | Lodiko Subcounty
KAABONG | Dodoth East County | Lolelia Subcounty
KAABONG | Dodoth East County | Lolelia South Subcounty
KAABONG | Dodoth East County | Loyoro Subcounty
KAABONG | Dodoth East County | Sidok (Kopoth) Subcounty
KAABONG | Dodoth North County | Kaabong East Subcounty
KAABONG | Dodoth North County | Kalapata Subcounty
KAABONG | Dodoth North County | Kalapata Town Council
KAABONG | Dodoth North County | Kathile Subcounty
KAABONG | Dodoth North County | Kathile Town Council
KAABONG | Dodoth North County | Kathile South Subcounty
KAABONG | Dodoth North County | Lotim Subcounty
KAABONG | Dodoth West County | Kakwanga Subcounty
KAABONG | Dodoth West County | Kapedo Subcounty
KAABONG | Dodoth West County | Kapedo Town Council
KAABONG | Dodoth West County | Kawalakol Subcounty
KAABONG | Dodoth West County | Lobalangit Subcounty
KAABONG | Dodoth West County | Sangar Subcounty
KAABONG | Ik County | Kamion Subcounty
KAABONG | Ik County | Morungole Subcounty
KAABONG | Ik County | Timu Subcounty
DOKOLO | Dokolo North County | Adok Subcounty
DOKOLO | Dokolo North County | Agwata Town Council
DOKOLO | Dokolo North County | Agwatta Subcounty
DOKOLO | Dokolo North County | Amwoma Subcounty
DOKOLO | Dokolo North County | Bata Town Council
DOKOLO | Dokolo North County | Batta Subcounty
DOKOLO | Dokolo North County | Dokolo Subcounty
DOKOLO | Dokolo North County | Okwalongwen Subcounty
DOKOLO | Dokolo South County | Adeknino Subcounty
DOKOLO | Dokolo South County | Dokolo Town Council
DOKOLO | Dokolo South County | Kangai Subcounty
DOKOLO | Dokolo South County | Kangai Town Council
DOKOLO | Dokolo South County | Kwera Subcounty
DOKOLO | Dokolo South County | Okwongodul Subcounty
LIRA | Erute County | Agali Subcounty
LIRA | Erute County | Agweng Subcounty
LIRA | Erute County | Agweng Town Council
LIRA | Erute County | Amach Subcounty
LIRA | Erute County | Amach Town Council
LIRA | Erute County | Aromo Subcounty
LIRA | Erute County | Ayami Subcounty
LIRA | Erute County | Barr Subcounty
LIRA | Erute County | Itek Subcounty
LIRA | Erute County | Ogur Subcounty
LIRA | Erute County | Wiodyek Subcounty
LIRA CITY | Lira East Division | Lira East Division
LIRA CITY | Lira West Division | Lira West Division
KOTIDO | Jie County | Kacheri Subcounty
KOTIDO | Jie County | Kacheri Town Council
KOTIDO | Jie County | Kamor Subcounty
KOTIDO | Jie County | Kanair Subcounty
KOTIDO | Jie County | Kapeta Subcounty
KOTIDO | Jie County | Kotido Subcounty
KOTIDO | Jie County | Lokitelaebu Town Council
KOTIDO | Jie County | Lokwakial Subcounty
KOTIDO | Jie County | Loletio Subcounty
KOTIDO | Jie County | Longaroe Subcounty
KOTIDO | Jie County | Maaru Subcounty
KOTIDO | Jie County | Nakapelimoru Subcounty
KOTIDO | Jie County | Napumpum Subcounty
KOTIDO | Jie County | Panyangara Subcounty
KOTIDO | Jie County | Rengen Subcounty
KOTIDO | Kotido Municipality | Kotido Central Division
KOTIDO | Kotido Municipality | Kotido North Division
KOTIDO | Kotido Municipality | Kotido South Division
KOTIDO | Kotido Municipality | Kotido West Division
PAKWACH | Jonam County | Alwi Subcounty
PAKWACH | Jonam County | Dei Subcounty
PAKWACH | Jonam County | Pakwach Subcounty
PAKWACH | Jonam County | Pakwach Town Council
PAKWACH | Jonam County | Panyango Subcounty
PAKWACH | Jonam County | Panyimur Subcounty
PAKWACH | Jonam County | Panyimur Town Council
PAKWACH | Jonam County | Pokwero Subcounty
PAKWACH | Jonam County | Ragem Subcounty
PAKWACH | Jonam County | Wadelai Subcounty
AMURU | Kilak North County | Atiak Subcounty
AMURU | Kilak North County | Atiak Town Council
AMURU | Kilak North County | Elegu Town Council
AMURU | Kilak North County | Opara Subcounty
AMURU | Kilak North County | Pabbo Subcounty
AMURU | Kilak North County | Pabbo Town Council
AMURU | Kilak North County | Pogo Subcounty
AMURU | Kilak South County | Amuru Subcounty
AMURU | Kilak South County | Amuru Town Council
AMURU | Kilak South County | Guru Guru Subcounty
AMURU | Kilak South County | Lakang Subcounty
AMURU | Kilak South County | Lamogi Subcounty
AMURU | Kilak South County | Layima Subcounty
AMOLATAR | Kioga County | Acii Subcounty
AMOLATAR | Kioga County | Agwingiri Subcounty
AMOLATAR | Kioga County | Amolatar Town Council
AMOLATAR | Kioga County | Muntu Subcounty
AMOLATAR | Kioga County | Nalubwoyo Subcounty
AMOLATAR | Kioga County | Namasale Subcounty
AMOLATAR | Kioga County | Namasale Town Council
AMOLATAR | Kioga North County | Abeja Subcounty
AMOLATAR | Kioga North County | Agikdak Subcounty
AMOLATAR | Kioga North County | Akwon Subcounty
AMOLATAR | Kioga North County | Aputi Subcounty
AMOLATAR | Kioga North County | Arwotcek Subcounty
AMOLATAR | Kioga North County | Awello Subcounty
AMOLATAR | Kioga North County | Etam Subcounty
AMOLATAR | Kioga North County | Etam Town Council
AMOLATAR | Kioga North County | Opali Subcounty
KOBOKO | Koboko Municipality | Koboko North Division
KOBOKO | Koboko Municipality | Koboko South Division
KOBOKO | Koboko Municipality | Koboko Western Division
KOBOKO | Koboko County | Dranya Subcounty
KOBOKO | Koboko County | Keri Town Council
KOBOKO | Koboko County | Kuluba Subcounty
KOBOKO | Koboko County | Lobule Subcounty
KOBOKO | Koboko County | Midia Subcounty
KOBOKO | Koboko County | Oraba Town Council
KOBOKO | Koboko North County | Abuku Subcounty
KOBOKO | Koboko North County | Ludara Subcounty
KOLE | Kole North County | Aboke Subcounty
KOLE | Kole North County | Aboke Town Council
KOLE | Kole North County | Alito Subcounty
KOLE | Kole North County | Alito Town Council
KOLE | Kole North County | Okwerodot Subcounty
KOLE | Kole South County | Akalo Subcounty
KOLE | Kole South County | Akalo Town Council
KOLE | Kole South County | Ayer Subcounty
KOLE | Kole South County | Bala Subcounty
KOLE | Kole South County | Bala Town Council
KOLE | Kole South County | Kole Town Council
KWANIA | Kwania County | Atongtidi Subcounty
KWANIA | Kwania County | Ayabi Subcounty
KWANIA | Kwania County | Ayabi Town Council
KWANIA | Kwania County | Cawente Subcounty
KWANIA | Kwania County | Nambieso Subcounty
KWANIA | Kwania North County | Abongomola Subcounty
KWANIA | Kwania North County | Aduku Subcounty
KWANIA | Kwania North County | Aduku Town Council
KWANIA | Kwania North County | Akali Subcounty
KWANIA | Kwania North County | Inomo Subcounty
KWANIA | Kwania North County | Inomo Town Council
ABIM | Labwor County | Abim Subcounty
ABIM | Labwor County | Abim Town Council
ABIM | Labwor County | Abuk Town Council
ABIM | Labwor County | Alerek Subcounty
ABIM | Labwor County | Alerek Town Council
ABIM | Labwor County | Atunga Subcounty
ABIM | Labwor County | Awach Subcounty
ABIM | Labwor County | Camkok Subcounty
ABIM | Labwor County | Kiru Town Council
ABIM | Labwor County | Lotukei Subcounty
ABIM | Labwor County | Magamaga Subcounty
ABIM | Labwor County | Morulem Subcounty
ABIM | Labwor County | Morulem Town Council
ABIM | Labwor County | Nyakwae Subcounty
ABIM | Labwor County | Opopongo Subcounty
ABIM | Labwor County | Orwamuge Town Council
LAMWO | Lamwo County | Aceba Subcounty
LAMWO | Lamwo County | Agoro Subcounty
LAMWO | Lamwo County | Katum Subcounty
LAMWO | Lamwo County | Lamwo Town Council
LAMWO | Lamwo County | Lokung Subcounty
LAMWO | Lamwo County | Lokung East Subcounty
LAMWO | Lamwo County | Madi-Opei Subcounty
LAMWO | Lamwo County | Madi-Opei Town Council
LAMWO | Lamwo County | Padibe Town Council
LAMWO | Lamwo County | Padibe East Subcounty
LAMWO | Lamwo County | Padibe West Subcounty
LAMWO | Lamwo County | Paloga Subcounty
LAMWO | Lamwo County | Potika Subcounty
LAMWO | Palabek County | Ogili Subcounty
LAMWO | Palabek County | Palabek Abera Subcounty
LAMWO | Palabek County | Palabek-Gem Subcounty
LAMWO | Palabek County | Palabek-Kal Subcounty
LAMWO | Palabek County | Palabek-Kal Town Council
LAMWO | Palabek County | Palabek Nyimur Subcounty
LAMWO | Palabek County | Palabek Refugee Settlement Camp
MADI OKOLLO | Lower Madi County | Ewanga Subcounty
MADI OKOLLO | Lower Madi County | Inde Town Council
MADI OKOLLO | Lower Madi County | Ogoko Subcounty
MADI OKOLLO | Lower Madi County | Pawor Subcounty
MADI OKOLLO | Lower Madi County | Rhino Camp Subcounty
MADI OKOLLO | Lower Madi County | Rhino Camp Town Council
MADI OKOLLO | Lower Madi County | Rigbo Subcounty
MADI OKOLLO | Upper Madi County | Anyiribu Subcounty
MADI OKOLLO | Upper Madi County | Offaka Subcounty
MADI OKOLLO | Upper Madi County | Okollo Subcounty
MADI OKOLLO | Upper Madi County | Okollo Town Council
MADI OKOLLO | Upper Madi County | Uleppi Subcounty
MARACHA | Maracha County | Agaii Town Council
MARACHA | Maracha County | Awiziru Subcounty
MARACHA | Maracha County | Kijomoro Subcounty
MARACHA | Maracha County | Obiba Subcounty
MARACHA | Maracha County | Okokoro Town Council
MARACHA | Maracha County | Olufe Subcounty
MARACHA | Maracha County | Oluvu Subcounty
MARACHA | Maracha County | Ovujo Town Council
MARACHA | Maracha East County | Ajira Subcounty
MARACHA | Maracha East County | Alikua Subcounty
MARACHA | Maracha East County | Drambu Subcounty
MARACHA | Maracha East County | Maracha Town Council
MARACHA | Maracha East County | Nyadri Subcounty
MARACHA | Maracha East County | Nyadri South Subcounty
MARACHA | Maracha East County | Oleba Subcounty
MARACHA | Maracha East County | Oleba Town Council
MARACHA | Maracha East County | Paranga Subcounty
MARACHA | Maracha East County | Tara Subcounty
MARACHA | Maracha East County | Yivu Subcounty
MOROTO | Matheniko County | Loputuk Subcounty
MOROTO | Matheniko County | Lotisan Subcounty
MOROTO | Matheniko County | Nadunget Subcounty
MOROTO | Matheniko County | Nadunget Town Council
MOROTO | Matheniko County | Rupa Subcounty
MOROTO | Moroto Municipality | Moroto North Division
MOROTO | Moroto Municipality | Moroto South Division
MOROTO | Moroto County | Abia Subcounty
MOROTO | Moroto County | Akura Subcounty
MOROTO | Moroto County | Alebtong Town Council
MOROTO | Moroto County | Aloi Subcounty
MOROTO | Moroto County | Aloi Town Council
MOROTO | Moroto County | Apala Subcounty
MOROTO | Moroto County | Apala Town Council
MOROTO | Tepeth County | Katikekile Subcounty
MOROTO | Tepeth County | Tapac Subcounty
KARENGA | Napore West County | Karenga Subcounty
KARENGA | Napore West County | Karenga Town Council
KARENGA | Napore West County | Kidepo Town Council
KARENGA | Napore West County | Lokori Subcounty
NEBBI | Nebbi Municipality | Abindu Division
NEBBI | Nebbi Municipality | Nebbi Central Division
NEBBI | Nebbi Municipality | Thatha Division
NEBBI | Padyere County | Acana Subcounty
NEBBI | Padyere County | Akworo Subcounty
NEBBI | Padyere County | Alala Subcounty
NEBBI | Padyere County | Atego Subcounty
NEBBI | Padyere County | Erussi Subcounty
NEBBI | Padyere County | Jupangira Subcounty
NEBBI | Padyere County | Kucwiny Subcounty
NEBBI | Padyere County | Ndhew Subcounty
NEBBI | Padyere County | Nebbi Subcounty
NEBBI | Padyere County | Nyaravur-Angal Town Council
NEBBI | Padyere County | Padwot Subcounty
NEBBI | Padyere County | Parombo Subcounty
NEBBI | Padyere County | Parombo Town Council
NWOYA | Nwoya County | Anaka (Payira) Subcounty
NWOYA | Nwoya County | Anaka Town Council
NWOYA | Nwoya County | Got Apwoyo Subcounty
NWOYA | Nwoya County | Lungulu Subcounty
NWOYA | Nwoya County | Purongo Subcounty
NWOYA | Nwoya County | Purongo Town Council
NWOYA | Nwoya East County | Alero Subcounty
NWOYA | Nwoya East County | Koch-Goma Subcounty
NWOYA | Nwoya East County | Koch Goma Town Council
NWOYA | Nwoya East County | Lii Subcounty
NWOYA | Nwoya East County | Paminyai Subcounty
OBONGI | Obongi County | Aliba Subcounty
OBONGI | Obongi County | Ewafa Subcounty
OBONGI | Obongi County | Gimara Subcounty
OBONGI | Obongi County | Itula Subcounty
OBONGI | Obongi County | Obongi Town Council
OBONGI | Obongi County | Palorinya Subcounty
OBONGI | Obongi County | Ralorinya Refugee Settlement
ZOMBO | Okoro County | Abanga Subcounty
ZOMBO | Okoro County | Athuma Subcounty
ZOMBO | Okoro County | Jangokoro Subcounty
ZOMBO | Okoro County | Nyapea Subcounty
ZOMBO | Okoro County | Padea Town Council
ZOMBO | Okoro County | Paidha Subcounty
ZOMBO | Okoro County | Paidha Subcounty
ZOMBO | Okoro County | Zombo Town Council
ZOMBO | Ora County | Akaa Subcounty
ZOMBO | Ora County | Alangi Subcounty
ZOMBO | Ora County | Atyak Subcounty
ZOMBO | Ora County | Kango Subcounty
ZOMBO | Ora County | Warr Subcounty
ZOMBO | Ora County | Warr Town Council
ZOMBO | Ora County | Zeu Subcounty
OMORO | Omoro County | Acet Town Council
OMORO | Omoro County | Akidi Subcounty
OMORO | Omoro County | Lakwana Subcounty
OMORO | Omoro County | Lakwaya Subcounty
OMORO | Omoro County | Lalogi Subcounty
OMORO | Omoro County | Odek Subcounty
OMORO | Omoro County | Omoro Town Council
OMORO | Omoro County | Orapwoyo Subcounty
OMORO | Tochi County | Abuga Subcounty
OMORO | Tochi County | Aremo Subcounty
OMORO | Tochi County | Bobi Subcounty
OMORO | Tochi County | Koro Subcounty
OMORO | Tochi County | Labora Subcounty
OMORO | Tochi County | Ongako Subcounty
OMORO | Tochi County | Palenga Town Council
OTUKE | Otuke County | Adwari Subcounty
OTUKE | Otuke County | Adwari Town Council
OTUKE | Otuke County | Alango Subcounty
OTUKE | Otuke County | Barjobi Subcounty
OTUKE | Otuke County | Barjobi Town Council
OTUKE | Otuke County | Okwang Subcounty
OTUKE | Otuke County | Okwang Town Council
OTUKE | Otuke County | Okwongo Town Council
OTUKE | Otuke East County | Ogor Subcounty
OTUKE | Otuke East County | Ogwette Subcounty
OTUKE | Otuke East County | Olilim Subcounty
OTUKE | Otuke East County | Olilim Town Council
OTUKE | Otuke East County | Orum Subcounty
OTUKE | Otuke East County | Otuke Town Council
OYAM | Oyam County | Aber Subcounty
OYAM | Oyam County | Abok Subcounty
OYAM | Oyam County | Acaba Subcounty
OYAM | Oyam County | Aleka Subcounty
OYAM | Oyam County | Iceme Subcounty
OYAM | Oyam County | Iceme Town Council
OYAM | Oyam County | Kamdini Subcounty
OYAM | Oyam County | Kamdini Town Council
OYAM | Oyam County | Loro Subcounty
OYAM | Oyam County | Loro Town Council
OYAM | Oyam County | Minakulu Subcounty
OYAM | Oyam County | Minakulu Town Council
OYAM | Oyam County | Myene Subcounty
OYAM | Oyam County | Ngai Subcounty
OYAM | Oyam County | Otwal Subcounty
OYAM | Oyam County | Oyam Town Council
NABILATUK | Pian County | Kosike Subcounty
NABILATUK | Pian County | Lolachat Subcounty
NABILATUK | Pian County | Lorengedwat Subcounty
NABILATUK | Pian County | Nabilatuk Subcounty
NABILATUK | Pian County | Nabilatuk Town Council
NABILATUK | Pian County | Natirae Subcounty
TEREGO | Terego East County | Imvepi Refugee Settlement
TEREGO | Terego East County | Odupi Subcounty
TEREGO | Terego East County | Omugo Subcounty
TEREGO | Terego East County | Rhino Camp Refugee Settlement
TEREGO | Terego East County | Uriama Subcounty
TEREGO | Terego West County | Aii-Vu Subcounty
TEREGO | Terego West County | Beleafe Subcounty
TEREGO | Terego West County | Katrini Subcounty
TEREGO | Terego West County | Leju Town Council
AMUDAT | Upe County | Abiliyep Subcounty
AMUDAT | Upe County | Achorichor Subcounty
AMUDAT | Upe County | Amudat Subcounty
AMUDAT | Upe County | Amudat Town Council
AMUDAT | Upe County | Karita Subcounty
AMUDAT | Upe County | Karita Town Council
AMUDAT | Upe County | Katabok Subcounty
AMUDAT | Upe County | Kangorok Subcounty
AMUDAT | Upe County | Lokales Subcounty
AMUDAT | Upe County | Loroo Subcounty
AMUDAT | Upe County | Losidok Subcounty
ARUA | Vurra County | Ajia Subcounty
ARUA | Vurra County | Arivu Subcounty
ARUA | Vurra County | Logiri Subcounty
ARUA | Vurra County | Vurra Subcounty
MOYO | West Moyo County | Aluru Subcounty
MOYO | West Moyo County | Dufile Subcouty
MOYO | West Moyo County | Laropi Subcounty
MOYO | West Moyo County | Laropi Town Council
MOYO | West Moyo County | Lefori Subcounty
MOYO | West Moyo County | Lefori Town Council
MOYO | West Moyo County | Metu Subcounty
MOYO | West Moyo County | Moyo Subcounty
MOYO | West Moyo County | Moyo Town Council
MOYO | West Moyo County | Otce Subcounty
`;

const EASTERN_REGION_DATASET = `
PALLISA | Agule County | Agule Subcounty
PALLISA | Agule County | Agule Town Council
PALLISA | Agule County | Akisim Subcounty
PALLISA | Agule County | Chelekura Subcounty
PALLISA | Agule County | Kameke Subcounty
PALLISA | Agule County | Oboliso Subcounty
AMURIA | Amuria County | Abarilela Subcounty
AMURIA | Amuria County | Abia Subcounty
AMURIA | Amuria County | Amolo Subcounty
AMURIA | Amuria County | Amuria Town Council
AMURIA | Amuria County | Apeduru Subcounty
AMURIA | Amuria County | Asamuk Subcounty
AMURIA | Amuria County | Asamuk Town Council
AMURIA | Amuria County | Kuju Subcounty
AMURIA | Amuria County | Wera Subcounty
AMURIA | Amuria County | Wera Town Council
AMURIA | Amuria County | Willa Subcounty
AMURIA | Orungo County | Akeriau Subcounty
AMURIA | Orungo County | Morungatuny Subcounty
AMURIA | Orungo County | Ogolai Subcounty
AMURIA | Orungo County | Ogongora Subcounty
AMURIA | Orungo County | Olwa Subcounty
AMURIA | Orungo County | Orungo Subcounty
AMURIA | Orungo County | Orungo Town Council
NAMISINDWA | Bubulo East County | Bubutu Subcounty
NAMISINDWA | Bubulo East County | Bubutu Town Council
NAMISINDWA | Bubulo East County | Bikiabi Subcounty
NAMISINDWA | Bubulo East County | Bukokho Subcounty
NAMISINDWA | Bubulo East County | Bumbo Subcounty
NAMISINDWA | Bubulo East County | Bumbo Town Council
NAMISINDWA | Bubulo East County | Bumityero Subcounty
NAMISINDWA | Bubulo East County | Bumwoni Subcounty
NAMISINDWA | Bubulo East County | Buwambwa Subcounty
NAMISINDWA | Bubulo East County | Lwakhakha Town Council
NAMISINDWA | Bubulo East County | Magale Subcounty
NAMISINDWA | Bubulo East County | Magale Town Council
NAMISINDWA | Bubulo East County | Mukhuyu Subcounty
NAMISINDWA | Bubulo East County | Nabitsikhi Subcounty
NAMISINDWA | Bubulo East County | Namboko Subcounty
NAMISINDWA | Bubulo East County | Namitsa Subcounty
NAMISINDWA | Bubulo West County | Bugobero Subcounty
NAMISINDWA | Bubulo West County | Bugobero Town Council
NAMISINDWA | Bubulo West County | Bukewa Subcounty
NAMISINDWA | Bubulo West County | Bunabutsale Subcounty
NAMISINDWA | Bubulo West County | Busukuya Subcounty
NAMISINDWA | Bubulo West County | Butooto Subcounty
NAMISINDWA | Bubulo West County | Butta Subcounty
NAMISINDWA | Bubulo West County | Buwagogo Subcounty
NAMISINDWA | Bubulo West County | Buwangani Subcounty
NAMISINDWA | Bubulo West County | Kaato Subcounty
NAMISINDWA | Bubulo West County | Khabutoola Subcounty
NAMISINDWA | Bubulo West County | Kimaluli Subcounty
NAMISINDWA | Bubulo West County | Lwanjusi Subcounty
NAMISINDWA | Bubulo West County | Manafwa Town Council
NAMISINDWA | Bubulo West County | Masaka Town Council
NAMISINDWA | Bubulo West County | Nalondo Subcounty
NAMISINDWA | Bubulo West County | Nangalwe Subcounty
NAMISINDWA | Bubulo West County | Sibanga Subcounty
NAMISINDWA | Bubulo West County | Weswa Subcounty
NAMISINDWA | Namisindwa County | Bukhabusi Subcounty
NAMISINDWA | Namisindwa County | Bukwhaweka Subcounty
NAMISINDWA | Namisindwa County | Bukwhaweka Town Council
NAMISINDWA | Namisindwa County | Bumumali Subcounty
NAMISINDWA | Namisindwa County | Bungati Subcounty
NAMISINDWA | Namisindwa County | Bupoto Subcounty
NAMISINDWA | Namisindwa County | Buwabwala Subcounty
NAMISINDWA | Namisindwa County | Buwatuwa Subcounty
NAMISINDWA | Namisindwa County | Luwa Town Council
NAMISINDWA | Namisindwa County | Mukoto Subcounty
NAMISINDWA | Namisindwa County | Namabya Subcounty
NAMISINDWA | Namisindwa County | Namisindwa Town Council
NAMISINDWA | Namisindwa County | Tsekululu Subcounty
SIRONKO | Budadiri County | Bubbeza Subcounty
SIRONKO | Budadiri County | Budadiri Town Council
SIRONKO | Budadiri County | Bugambi Subcounty
SIRONKO | Budadiri County | Bugitimwa Subcounty
SIRONKO | Budadiri County | Bugusege Town Council
SIRONKO | Budadiri County | Buhugu Subcounty
SIRONKO | Budadiri County | Bukhulo Subcounty
SIRONKO | Budadiri County | Bukiise Subcounty
SIRONKO | Budadiri County | Bukiiti Town Council
SIRONKO | Budadiri County | Bukiyi Subcounty
SIRONKO | Budadiri County | Bukyabo Subcounty
SIRONKO | Budadiri County | Bukyambi Subcounty
SIRONKO | Budadiri County | Bumalimba Subcounty
SIRONKO | Budadiri County | Bumasifwa Subcounty
SIRONKO | Budadiri County | Bumulisha Subcounty
SIRONKO | Budadiri County | Bunyafwa Subcounty
SIRONKO | Budadiri County | Busamaga Subcounty
SIRONKO | Budadiri County | Busiita Subcounty
SIRONKO | Budadiri County | Busulani Subcounty
SIRONKO | Budadiri County | Butandiga Subcounty
SIRONKO | Budadiri County | Butandiga Town Council
SIRONKO | Budadiri County | Buteza Subcounty
SIRONKO | Budadiri County | Buteza Town Council
SIRONKO | Budadiri County | Buwalasi Subcounty
SIRONKO | Budadiri County | Buwasa Subcounty
SIRONKO | Budadiri County | Buweri Town Council
SIRONKO | Budadiri County | Buyobo Subcounty
SIRONKO | Budadiri County | Dahami Subcounty
SIRONKO | Budadiri County | Elgon Subcounty
SIRONKO | Budadiri County | Gombe Gasawa Town Council
SIRONKO | Budadiri County | Kama Town Council
SIRONKO | Budadiri County | Kikobero Subcounty
SIRONKO | Budadiri County | Legenya Subcounty
SIRONKO | Budadiri County | Lulena Subcounty
SIRONKO | Budadiri County | Mafudu Subcounty
SIRONKO | Budadiri County | Masaba Subcounty
SIRONKO | Budadiri County | Mutufu Town Council
SIRONKO | Budadiri County | Nalusala Subcounty
SIRONKO | Budadiri County | Namaguli Subcounty
SIRONKO | Budadiri County | Namugabwe Subcounty
SIRONKO | Budadiri County | Sironko Town Council
SIRONKO | Budadiri County | Zesui Subcounty
BUDAKA | Budaka County | Budaka Subcounty
BUDAKA | Budaka County | Budaka Town Council
BUDAKA | Budaka County | Kabuna Subcounty
BUDAKA | Budaka County | Kachomo Subcounty
BUDAKA | Budaka County | Kachomo Town Council
BUDAKA | Budaka County | Kaderuna Subcounty
BUDAKA | Budaka County | Kakule Subcounty
BUDAKA | Budaka County | Lyama Town Council
BUDAKA | Budaka County | Naboa Town Council
BUDAKA | Budaka County | Nansanga Subcounty
BUDAKA | Budaka County | Tademeri Subcouty
BUDAKA | Iki-Iki County | Iki-iki Subcounty
BUDAKA | Iki-Iki County | Iki-iki Town Council
BUDAKA | Iki-Iki County | Kadimukoli Subcounty
BUDAKA | Iki-Iki County | Kakoli Subcounty
BUDAKA | Iki-Iki County | Kameruka Subcounty
BUDAKA | Iki-Iki County | Kamonkoli Subcounty
BUDAKA | Iki-Iki County | Kamonkoli Town Council
BUDAKA | Iki-Iki County | Katira Subcounty
BUDAKA | Iki-Iki County | Mugiti Subcounty
BUYENDE | Budipo East County | Bugaya Subcounty
BUYENDE | Budipo East County | Gumpi Subcounty
BUYENDE | Budipo East County | Irundu Subcounty
BUYENDE | Budipo East County | Irundu Town Council
BUYENDE | Budipo East County | Kagulu Subcounty
BUYENDE | Budipo East County | Ngandho Subcounty
BUYENDE | Budipo West County | Bukungu Town Council
BUYENDE | Budipo West County | Buyanja Subcounty
BUYENDE | Budipo West County | Buyende Subcounty
BUYENDE | Budipo West County | Buyende Townn Council
BUYENDE | Budipo West County | Kidera Subcounty
BUYENDE | Budipo West County | Kidera Town Council
BUYENDE | Budipo West County | Ndolwa Subcounty
BUYENDE | Budipo West County | Nkondo Subcounty
KAMULI | Bugabula County | Balawoli Subcounty
KAMULI | Bugabula County | Balawoli Town Council
KAMULI | Bugabula County | Bulopa Subcounty
KAMULI | Bugabula County | Butansi Subcounty
KAMULI | Bugabula County | Kagumba Subcounty
KAMULI | Bugabula County | Kitayunjwa Subcounty
KAMULI | Bugabula County | Nabwigulu Subcounty
KAMULI | Bugabula County | Namasagali Subcounty
KAMULI | Bugabula County | Namwendwa Subcounty
KAMULI | Bugabula County | Namwendwa Town Council
KAMULI | Buzaaya County | Bugulumbya Subcounty
KAMULI | Buzaaya County | Kasambira Town Council
KAMULI | Buzaaya County | Kisozi Subcounty
KAMULI | Buzaaya County | Kisozi Town Council
KAMULI | Buzaaya County | Magogo Subcounty
KAMULI | Buzaaya County | Mbulamuti Town Council
KAMULI | Buzaaya County | Nawanyago Subcounty
KAMULI | Buzaaya County | Nawanyago Town Council
KAMULI | Buzaaya County | Wankole Subcounty
KAMULI | Kamuli Municipality | Kamuli Northern Division
KAMULI | Kamuli Municipality | Kamuli Southern Division
BUGIRI | Bugiri Municipality | Bugiri Eastern Division
BUGIRI | Bugiri Municipality | Bugiri Western Division
BUGIRI | Bukooli County | Budhaya Subcounty
BUGIRI | Bukooli County | Bulesa Subcounty
BUGIRI | Bukooli County | Bulidha Subcounty
BUGIRI | Bukooli County | Buluguyi Subcounty
BUGIRI | Bukooli County | Busowa Town Council
BUGIRI | Bukooli County | Buwunga Subcounty
BUGIRI | Bukooli County | Buwuni Town Council
BUGIRI | Bukooli County | Iwemba Subcounty
BUGIRI | Bukooli County | Kapyanga Subcounty
BUGIRI | Bukooli County | Mayuge Town Council
BUGIRI | Bukooli County | Mutelele Town Council
BUGIRI | Bukooli County | Muterere Subcounty
BUGIRI | Bukooli County | Muwayo Town Council
BUGIRI | Bukooli County | Nabukalu Subcounty
BUGIRI | Bukooli County | Nabukalu Town Council
BUGIRI | Bukooli County | Namayemba Town Council
BUGIRI | Bukooli County | Nankoma Subcounty
BUGIRI | Bukooli County | Nankoma Town Council
BUGIRI | Bukooli Island County | Bukana Subcounty
BUGIRI | Bukooli Island County | Lolwe Subcounty
BUGIRI | Bukooli Island County | Sigulu Islands
BUGIRI | Bukooli South County | Buswale Subcounty
BUGIRI | Bukooli South County | Buyinja Subcounty
BUGIRI | Bukooli South County | Namayingo Town Council
BUGWERI | Bugweri County | Busembatia Town Council
BUGWERI | Bugweri County | Busesa Town Council
BUGWERI | Bugweri County | Buyanga Subcounty
BUGWERI | Bugweri County | Idudi Town Council
BUGWERI | Bugweri County | Igombe Subcounty
BUGWERI | Bugweri County | Makuutu Subcounty
BUGWERI | Bugweri County | Namalemba Subcounty
BUKEDEA | Bukedea County | Aminit Subcounty
BUKEDEA | Bukedea County | Bukedea Subcounty
BUKEDEA | Bukedea County | Bukedea Town Council
BUKEDEA | Bukedea County | Kabarwa Subcounty
BUKEDEA | Bukedea County | Kamutur Subcounty
BUKEDEA | Bukedea County | Kangole Subcounty
BUKEDEA | Bukedea County | Kidongole Subcounty
BUKEDEA | Bukedea County | Kocheka Subcounty
BUKEDEA | Bukedea County | Koena Subcounty
BUKEDEA | Bukedea County | Kolir Subcounty
BUKEDEA | Bukedea County | Malera Subcounty
BUKEDEA | Kachumbala County | Aligoi Subcounty
BUKEDEA | Kachumbala County | Kachumbala Subcounty
BUKEDEA | Kachumbala County | Komuge Subcounty
BUKEDEA | Kachumbala County | Kongunga Town Council
BUKEDEA | Kachumbala County | Kwarikwar Subcounty
NAMUTUMBA | Bukono County | Ivukula Subcounty
NAMUTUMBA | Bukono County | Ivukula Town Council
NAMUTUMBA | Bukono County | Kibaale Subcounty
NAMUTUMBA | Bukono County | Kibale Town Council
NAMUTUMBA | Bukono County | Nabweyo Subcounty
NAMUTUMBA | Bukono County | Nangonde Subcounty
NAMUTUMBA | Bukono County | Nangonde Town Council
NAMUTUMBA | Busiki County | Bugobi Subcounty
NAMUTUMBA | Busiki County | Bugobi Town Council
NAMUTUMBA | Busiki County | Bulange Subcounty
NAMUTUMBA | Busiki County | Kizuba Subcounty
NAMUTUMBA | Busiki County | Namutumba Subcounty
NAMUTUMBA | Busiki County | Namutumba Town Council
NAMUTUMBA | Busiki County | Nawaikona Subcounty
NAMUTUMBA | Busiki County | Nsinze Subcounty
NAMUTUMBA | Busiki County | Nsinze Town Council
NAMUTUMBA | Busiki North County | Kagulu Subcounty
NAMUTUMBA | Busiki North County | Kiwanyi Subcounty
NAMUTUMBA | Busiki North County | Magada Subcounty
NAMUTUMBA | Busiki North County | Mazuba Subcounty
BULAMBULI | Bulambuli County | Bukhalu Subcounty
BULAMBULI | Bulambuli County | Bulambuli Town Council
BULAMBULI | Bulambuli County | Bumufuni Subcounty
BULAMBULI | Bulambuli County | Bunalwere Subcounty
BULAMBULI | Bulambuli County | Bunambutye Subcounty
BULAMBULI | Bulambuli County | Buwanyanga Subcounty
BULAMBULI | Bulambuli County | Buyaga Town Council
BULAMBULI | Bulambuli County | Bwikhonge Subcounty
BULAMBULI | Bulambuli County | Muyembe Subcounty
BULAMBULI | Bulambuli County | Nabbongo Subcounty
BULAMBULI | Elgon County | Bulago Subcounty
BULAMBULI | Elgon County | Buluganya Subcounty
BULAMBULI | Elgon County | Bumasobo Subcounty
BULAMBULI | Elgon County | Lusha Subcounty
BULAMBULI | Elgon County | Nabiwutulu Subcounty
BULAMBULI | Elgon County | Simu Subcounty
BULAMBULI | Elgon County | Sotti Subcounty
BULAMBULI | Elgon North County | Bufumbo Subcounty
BULAMBULI | Elgon North County | Buginyanya Subcounty
BULAMBULI | Elgon North County | Bulegeni Subcounty
BULAMBULI | Elgon North County | Bulegeni Town Council
BULAMBULI | Elgon North County | Bumugibole Subcounty
BULAMBULI | Elgon North County | Kamu Subcounty
BULAMBULI | Elgon North County | Masira Subcounty
BULAMBULI | Elgon North County | Namisuni Subcounty
BULAMBULI | Elgon North County | Sisiyi Subcounty
KALIRO | Bulamogi County | Budomero Subcounty
KALIRO | Bulamogi County | Bulumba Town Council
KALIRO | Bulamogi County | Bumanya Subcounty
KALIRO | Bulamogi County | Buyinda Subcounty
KALIRO | Bulamogi County | Gadumire Subcounty
KALIRO | Bulamogi County | Kaliro Town Council
KALIRO | Bulamogi County | Kasokwe Subcounty
KALIRO | Bulamogi County | Kisinda Subcounty
KALIRO | Bulamogi County | Namugongo Subcounty
KALIRO | Bulamogi County | Namwiwa Subcounty
KALIRO | Bulamogi County | Namwiwa Town Council
KALIRO | Bulamogi North West County | Bukamba Subcounty
KALIRO | Bulamogi North West County | Nansololo Subcounty
KALIRO | Bulamogi North West County | Nawaikoke Subcounty
KALIRO | Bulamogi North West County | Nawaikoke Town Council
MBALE | Bungokho Central County | Bumbobi Subcounty
MBALE | Bungokho Central County | Bungokho Subcounty
MBALE | Bungokho Central County | Busano Subcounty
MBALE | Bungokho Central County | Busoba Subcounty
MBALE | Bungokho Central County | Nabumali Town Council
MBALE | Bungokho Central County | Nyondo Subcounty
MBALE | Bungokho County | Bubyangu Subcounty
MBALE | Bungokho County | Budwale Subcounty
MBALE | Bungokho County | Bufumbo Subcounty
MBALE | Bungokho County | Bukhiende Subcounty
MBALE | Bungokho County | Bumasikye Subcounty
MBALE | Bungokho County | Bunambutye Subcounty
MBALE | Bungokho County | Busiu Subcounty
MBALE | Bungokho County | Busiu Town Council
MBALE | Bungokho County | Jewa Town Council
MBALE | Bungokho County | Lukhonge Subcounty
MBALE | Bungokho County | Wanale Subcounty
MBALE | Bunyole East County | Bufujja-Kachonga Town Council
MBALE | Bunyole East County | Butaleja Subcounty
MBALE | Bunyole East County | Butaleja Town Council
MBALE | Bunyole East County | Himutu Subcounty
MBALE | Bunyole East County | Kachonga Subcounty
MBALE | Bunyole East County | Mazimasa Subcounty
MBALE | Bunyole East County | Nabiganda Town Council
MBALE | Bunyole East County | Naweyo Subcounty
MBALE | Bunyole West County | Budumba Subcounty
MBALE | Bunyole West County | Busaba Subcounty
MBALE | Bunyole West County | Busaba Town Council
MBALE | Bunyole West County | Busabi Subcounty
MBALE | Bunyole West County | Busolwe Subcounty
MBALE | Bunyole West County | Busolwe Town Council
MBALE | Bunyole West County | Nawanjofu Subcounty
MAYUGE | Bunya County | Baitambogwe Subcounty
MAYUGE | Bunya County | Bugadde Town Council
MAYUGE | Bunya County | Bukabooli Subcounty
MAYUGE | Bunya County | Bukatube Subcounty
MAYUGE | Bunya County | Busakira Subcounty
MAYUGE | Bunya County | Buwaaya Subcounty
MAYUGE | Bunya County | Bwondha Town Council
MAYUGE | Bunya County | Imanyiro Subcounty
MAYUGE | Bunya County | Jaguzi Subcounty
MAYUGE | Bunya County | Kigandalo Subcounty
MAYUGE | Bunya County | Kityerera Subcounty
MAYUGE | Bunya County | Magamaga Town Council
MAYUGE | Bunya County | Malongo Subcounty
MAYUGE | Bunya County | Mayuge Town Council
MAYUGE | Bunya County | Mpungwe Subcounty
MAYUGE | Bunya County | Wairasa Subcounty
BUDUDA | Bushigai County | Bukigai Subcounty
BUDUDA | Bushigai County | Bukigai Town Council
BUDUDA | Bushigai County | Bunatsami Subcounty
BUDUDA | Bushigai County | Bushiribo Subcounty
BUDUDA | Bushigai County | Kikholo Town Council
BUDUDA | Bushigai County | Nabweya Subcounty
BUDUDA | Lutseshe County | Bubiita Subcounty
BUDUDA | Lutseshe County | Bufuma Subcounty
BUDUDA | Lutseshe County | Bukalasi Subcounty
BUDUDA | Lutseshe County | Bulucheke Subcounty
BUDUDA | Lutseshe County | Bumayoka Subcounty
BUDUDA | Lutseshe County | Bumwalukani Subcounty
BUDUDA | Lutseshe County | Bundesi Subcounty
BUDUDA | Lutseshe County | Bushiyi Subcounty
BUDUDA | Lutseshe County | Busiriwa Subcounty
BUDUDA | Lutseshe County | Buwali Subcounty
BUDUDA | Lutseshe County | Kuushu Town Council
BUDUDA | Lutseshe County | Mabono Subcounty
BUDUDA | Lutseshe County | Nalwanza Subcounty
BUDUDA | Manjiya County | Bududa Subcounty
BUDUDA | Manjiya County | Bududa Town Council
BUDUDA | Manjiya County | Bukibino Subcounty
BUDUDA | Manjiya County | Bukibokolo Subcounty
BUDUDA | Manjiya County | Bumasheti Subcounty
BUDUDA | Manjiya County | Bunabutiti Subcounty
BUDUDA | Manjiya County | Bushika Subcounty
BUDUDA | Manjiya County | Nakatsi Subcounty
BUDUDA | Manjiya County | Nangako Town Council
BUSIA | Busia Municipality | Busia Eastern Division
BUSIA | Busia Municipality | Busia Western Division
BUSIA | Samia Bugwe Central County | Buhehe Subcounty
BUSIA | Samia Bugwe Central County | Masaba Subcounty
BUSIA | Samia Bugwe Central County | Masafu Subcounty
BUSIA | Samia Bugwe Central County | Maasafu Town Council
BUSIA | Samia Bugwe Central County | Masinya Subcounty
BUSIA | Samia Bugwe County | Bulumbi Subcounty
BUSIA | Samia Bugwe County | Busime Subcounty
BUSIA | Samia Bugwe County | Busitema Subcounty
BUSIA | Samia Bugwe County | Buteba Subcounty
BUSIA | Samia Bugwe County | Buyanga Subcounty
BUSIA | Samia Bugwe County | Dabani Subcounty
BUSIA | Samia Bugwe County | Lumino Subcounty
BUSIA | Samia Bugwe County | Lumino-Majanji Town Council
BUSIA | Samia Bugwe County | Lunyo Subcounty
BUSIA | Samia Bugwe County | Majanji Subcounty
BUSIA | Samia Bugwe County | Namungodi Town Council
BUSIA | Samia Bugwe County | Sikuda Subcounty
BUSIA | Samia Bugwe County | Tiira Town Council
BUTEBO | Butebo County | Butebo Subcounty
BUTEBO | Butebo County | Butebo Town Council
BUTEBO | Butebo County | Kabelai Subcounty
BUTEBO | Butebo County | Kabwangasi Subcounty
BUTEBO | Butebo County | Kabwangasi Town Council
BUTEBO | Butebo County | Kachuru Subcounty
BUTEBO | Butebo County | Kadokolene Subcounty
BUTEBO | Butebo County | Kakoro Subcounty
BUTEBO | Butebo County | Kakoro Town Council
BUTEBO | Butebo County | Kanginima Subcounty
BUTEBO | Butebo County | Kanginima Town Council
BUTEBO | Butebo County | Kanyum Subcounty
BUTEBO | Butebo County | Kapunyasi Subcounty
BUTEBO | Butebo County | Maizimasa Subcounty
BUTEBO | Butebo County | Petete Subcounty
BUTEBO | Butebo County | Petete Town Council
BUTEBO | Butebo County | Putti Subcounty
JINJA | Butembe County | Busedde Subcounty
JINJA | Butembe County | Kakira Town Council
JINJA | Kagoma County | Butagaya Subcounty
JINJA | Kagoma County | Namagera Town Council
JINJA | Kagoma North County | Buwenge Subcounty
JINJA | Kagoma North County | Buwenge Town Council
JINJA | Kagoma North County | Buyengo Town Council
JINJA CITY | Jinja North Division | Jinja North Division
JINJA CITY | Jinja South Division | Jinja South Division
MANAFWA | Butiru County | Bukhadala Subcounty
MANAFWA | Butiru County | Bukhofu Subcounty
MANAFWA | Butiru County | Bukoma Subcounty
MANAFWA | Butiru County | Bukusu Subcounty
MANAFWA | Butiru County | Bunabwana Subcounty
MANAFWA | Butiru County | Butiru Subcounty
MANAFWA | Butiru County | Butiru Town Council
MANAFWA | Butiru County | Buwaya Town Council
MANAFWA | Butiru County | Buyinza Town Council
MANAFWA | Butiru County | Maefe Subcounty
MANAFWA | Butiru County | Makenya Subcounty
MANAFWA | Butiru County | Mayanza Subcounty
MANAFWA | Butiru County | Sisuni Subcounty
SOROTI | Dakabela County | Arapai Subcounty
SOROTI | Dakabela County | Katine Subcounty
SOROTI | Dakabela County | Oculoi Subcounty
SOROTI | Dakabela County | Tubur Subcounty
SOROTI | Dakabela County | Tubur Town Council
SOROTI | Gweri County | Aukot Subcounty
SOROTI | Gweri County | Awaliwal Subcounty
SOROTI | Gweri County | Gweri Subcounty
SOROTI | Soroti County | Asuret Subcounty
SOROTI | Soroti County | Kamuda Subcounty
SOROTI | Soroti County | Lalle Subcounty
SOROTI | Soroti County | Ocokican Subcounty
SOROTI CITY | Soroti East Division | Soroti East Division
SOROTI CITY | Soroti West Division | Soroti West Division
PALLISA | Gogonyo County | Apopong Subcounty
PALLISA | Gogonyo County | Gogonyo Subcounty
PALLISA | Gogonyo County | Kaukura Subcounty
PALLISA | Gogonyo County | Obutet Subcounty
PALLISA | Kibale County | Kibale Subcounty
PALLISA | Kibale County | Kibale Town Council
PALLISA | Kibale County | Opwateta Subcounty
PALLISA | Pallisa County | Boliso Subcounty
PALLISA | Pallisa County | Kamuge Subcounty
PALLISA | Pallisa County | Kamuge Town Council
PALLISA | Pallisa County | Kasodo Subcounty
PALLISA | Pallisa County | Olok Subcounty
PALLISA | Pallisa County | Pallisa Subcounty
PALLISA | Pallisa County | Pallisa Town Council
PALLISA | Pallisa County | Puti-Puti Subcounty
IGANGA | Iganga Municipality | Iganga Central Division
IGANGA | Iganga Municipality | Iganga Northern Division
IGANGA | Kigulu County | Bulamagi Subcounty
IGANGA | Kigulu County | Kidaago Subcounty
IGANGA | Kigulu County | Nabitende Subcounty
IGANGA | Kigulu County | Nakalama Subcounty
IGANGA | Kigulu County | Nakigo Subcounty
IGANGA | Kigulu County | Nambale Subcounty
IGANGA | Kigulu County | Namungalwe Town Council
IGANGA | Kigulu County | Nawandala Subcounty
IGANGA | Kigulu County | Nawanyingi Subcounty
KABERAMAIDO | Kaberamaido County | Alwa Subcounty
KABERAMAIDO | Kaberamaido County | Aperikira Subcounty
KABERAMAIDO | Kaberamaido County | Kaberamaido Subcounty
KABERAMAIDO | Kaberamaido County | Kaberamaido Town Council
KABERAMAIDO | Kaberamaido County | Oriamo Subcounty
KABERAMAIDO | Ochero County | Kobulubulu Subcounty
KABERAMAIDO | Ochero County | Ochero Subcounty
KABERAMAIDO | Ochero County | Ochero Town Council
KABERAMAIDO | Ochero County | Okile Subcounty
KIBUKU | Kabweri County | Bulangira Subcounty
KIBUKU | Kabweri County | Bulangira Town Council
KIBUKU | Kabweri County | Goli Goli Subcounty
KIBUKU | Kabweri County | Kabweri Subcounty
KIBUKU | Kabweri County | Kadama Subcounty
KIBUKU | Kabweri County | Kadama Town Council
KIBUKU | Kabweri County | Kagumu Subcounty
KIBUKU | Kabweri County | Kakutu Subcounty
KIBUKU | Kabweri County | Kenkebu Subcounty
KIBUKU | Kabweri County | Kirika Subcounty
KIBUKU | Kabweri County | Nabiswa Subcounty
KIBUKU | Kabweri County | Nandere Subcounty
KIBUKU | Kibuku County | Buseta Subcounty
KIBUKU | Kibuku County | Kasasira Subcounty
KIBUKU | Kibuku County | Kasasira Town Council
KIBUKU | Kibuku County | Kibuku Subcounty
KIBUKU | Kibuku County | Kibuku Town Council
KIBUKU | Kibuku County | Kituti Subcounty
KIBUKU | Kibuku County | Lwatama Subcounty
KIBUKU | Kibuku County | Nankodo Subcounty
KIBUKU | Kibuku County | Tirinyi Subcounty
KIBUKU | Kibuku County | Tirinyi Town Council
KALAKI | Kalaki County | Anyara Subcounty
KALAKI | Kalaki County | Apapai Subcounty
KALAKI | Kalaki County | Bululu Subcounty
KALAKI | Kalaki County | Kakure Subcounty
KALAKI | Kalaki County | Kalaki Subcounty
KALAKI | Kalaki County | Kalaki Town Council
KALAKI | Kalaki County | Ocelakur Subcounty
KALAKI | Kalaki County | Ogwolo Subcounty
KALAKI | Kalaki County | Otuboi Subcounty
KALAKI | Kalaki County | Otuboi Town Council
KUMI | Kanyum County | Kadami Subcounty
KUMI | Kanyum County | Kakures Subcounty
KUMI | Kanyum County | Kamaca Subcounty
KUMI | Kanyum County | Kanyum Subcounty
KUMI | Kanyum County | Kanyum Town Council
KUMI | Kanyum County | Mukongoro Subcounty
KUMI | Kanyum County | Mukongoro Town Council
KUMI | KUMI MUICIPALITY | Kumi North Division
KUMI | KUMI MUICIPALITY | Kumi South Division
KUMI | Kumi County | Atutur Subcounty
KUMI | Kumi County | Kanapa Subcounty
KUMI | Kumi County | Kumi Subcounty
KUMI | Kumi County | Nyero Subcounty
KUMI | Kumi County | Nyero Town Council
KUMI | Kumi County | Ogooma Subcounty
KUMI | Kumi County | Ongino Subcounty
KUMI | Kumi County | Ongino Town Council
KUMI | Kumi County | Tisai Subcounty
KAPCHORWA | Kapchorwa Municipality | Kapchorwa Central Division
KAPCHORWA | Kapchorwa Municipality | Kapchorwa East Division
KAPCHORWA | Kapchorwa Municipality | Kapchorwa West Division
KAPCHORWA | Tingey County | Amukol Subcounty
KAPCHORWA | Tingey County | Chema Subcounty
KAPCHORWA | Tingey County | Chepterech Subcounty
KAPCHORWA | Tingey County | Gamogo Subcounty
KAPCHORWA | Tingey County | Kabeywa Subcounty
KAPCHORWA | Tingey County | Kapsinda Subcounty
KAPCHORWA | Tingey County | Kaptanya Subcounty
KAPCHORWA | Tingey County | Kaserem Subcounty
KAPCHORWA | Tingey County | Kawowo Subcounty
KAPCHORWA | Tingey County | Munarya Subcounty
KAPCHORWA | Tingey County | Sipi Subcounty
KAPCHORWA | Tingey County | Sipi Town Council
KAPELEBYONG | Kapelebyong County | Acinga Subcounty
KAPELEBYONG | Kapelebyong County | Acowa Subcounty
KAPELEBYONG | Kapelebyong County | Acowa Town Council
KAPELEBYONG | Kapelebyong County | Akore Town Council
KAPELEBYONG | Kapelebyong County | Akoromit Subcounty
KAPELEBYONG | Kapelebyong County | Alito Subcounty
KAPELEBYONG | Kapelebyong County | Kapelebyong Subcounty
KAPELEBYONG | Kapelebyong County | Kapelebyong Town Council
KAPELEBYONG | Kapelebyong County | Obalanga Subcounty
KAPELEBYONG | Kapelebyong County | Okungur Subcounty
NGORA | Kapir County | Agirigiroi Subcounty
NGORA | Kapir County | Kapir Subcounty
NGORA | Kapir County | Morukakise Subcounty
NGORA | Kapir County | Mukura Subcounty
NGORA | Kapir County | Mukura Town Council
NGORA | Ngora County | Atoot Subcounty
NGORA | Ngora County | Kobwin Subcounty
NGORA | Ngora County | Ngora Subcounty
NGORA | Ngora County | Ngora Town Council
NGORA | Ngora County | Odwarat Subcounty
NGORA | Ngora County | Opot Town Council
SERERE | Kasilo County | Bugondo Subcounty
SERERE | Kasilo County | Kadungulu Subcounty
SERERE | Kasilo County | Kadungulu Town Council
SERERE | Kasilo County | Kagwara Town Council
SERERE | Kasilo County | Kasilo Town Council
SERERE | Pingire County | Kidetok Town Council
SERERE | Pingire County | Labor Subcounty
SERERE | Pingire County | Pingire Subcounty
SERERE | Serere County | Atiira Subcounty
SERERE | Serere County | Kateta Subcounty
SERERE | Serere County | Kyere Subcounty
SERERE | Serere County | Kyere Town Council
SERERE | Serere County | Olio Subcounty
SERERE | Serere County | Serere Town Council
BUKWO | Kongasis County | Amanang Subcounty
BUKWO | Kongasis County | Bukwa Subcounty
BUKWO | Kongasis County | Bukwo Town Council
BUKWO | Kongasis County | Chepkwasta Subcounty
BUKWO | Kongasis County | Kapkoros Subcounty
BUKWO | Kongasis County | Kapnandi Town Council
BUKWO | Kongasis County | Kapsarur Subcounty
BUKWO | Kongasis County | Kaptererwo Subcounty
BUKWO | Kongasis County | Senendet Subcounty
BUKWO | Kongasis County | Suam Subcounty
BUKWO | Kongasis County | Suam Town Council
BUKWO | T’oo County | Brim Subcounty
BUKWO | T’oo County | Chesower Subcounty
BUKWO | T’oo County | Kabei Subcounty
BUKWO | T’oo County | Kabei Subcounty
BUKWO | T’oo County | Kamet Subcounty
BUKWO | T’oo County | Kortek Subcounty
BUKWO | T’oo County | Lwongon Subcounty
BUKWO | T’oo County | Mutushet Subcounty
BUKWO | T’oo County | Riwo Subcounty
BUKWO | T’oo County | Riwo Town Council
BUKWO | T’oo County | Tulel Subcounty
KWEEN | Kween County | Benet Subcounty
KWEEN | Kween County | Binyiny Subcounty
KWEEN | Kween County | Binyiny Town Council
KWEEN | Kween County | Kapkwata Subcounty
KWEEN | Kween County | Kapnarkut Town Council
KWEEN | Kween County | Kaproron Subcounty
KWEEN | Kween County | Kaproron Town Council
KWEEN | Kween County | Kaptoyoy Subcounty
KWEEN | Kween County | Kaptum Subcounty
KWEEN | Kween County | Kaseko Subcounty
KWEEN | Kween County | Kitawoi Subcounty
KWEEN | Kween County | Kwanyiy Subcounty
KWEEN | Kween County | Kwosir Subcounty
KWEEN | Kween County | Moyok Subcounty
KWEEN | Kween County | Tuikat Subcounty
KWEEN | Soi County | Chepsukunya Town Council
KWEEN | Soi County | Greek River (Kiriki)
KWEEN | Soi County | Ngenge Subcounty
KWEEN | Soi County | Sundet Subcounty
LUUKA | Luuka North County | Bukooma Subcounty
LUUKA | Luuka North County | Bukoova Town Council
LUUKA | Luuka North County | Bulongo Subcounty
LUUKA | Luuka North County | Ikumbya Subcounty
LUUKA | Luuka North County | Luuka Town Council
LUUKA | Luuka South County | Bukanga Subcounty
LUUKA | Luuka South County | Bulanga Town Council
LUUKA | Luuka South County | Busalamu Town Council
LUUKA | Luuka South County | Irongo Subcounty
LUUKA | Luuka South County | Kyanvuma Town Council
LUUKA | Luuka South County | Nawampiti Subcounty
LUUKA | Luuka South County | Waibuga Subcounty
MBALE CITY | Mbale Industrial Division | Mbale Industrial Division
MBALE CITY | Mbale Northern Division | Mbale Northern Division
NAMAYINGO | Namayingo South County | Banda Subcounty
NAMAYINGO | Namayingo South County | Banda Town Council
NAMAYINGO | Namayingo South County | Buhemba Subcounty
NAMAYINGO | Namayingo South County | Mutumba Subcounty
NAMAYINGO | Namayingo South County | Mutumba Town Council
KATAKWI DISTRIC | Ngariam County | Akoboi Subcounty
KATAKWI DISTRIC | Ngariam County | Getom Subcounty
KATAKWI DISTRIC | Ngariam County | Katakwi Subcounty
KATAKWI DISTRIC | Ngariam County | Katakwi Town Council
KATAKWI DISTRIC | Ngariam County | Ngariam Subcounty
KATAKWI DISTRIC | Ngariam County | Okore Subcounty
KATAKWI DISTRIC | Ngariam County | Palam Subcounty
KATAKWI DISTRIC | Toroma County | Amusia Subcounty
KATAKWI DISTRIC | Toroma County | Angodingod Subcounty
KATAKWI DISTRIC | Toroma County | Kapujan Subcounty
KATAKWI DISTRIC | Toroma County | Magoro Subcounty
KATAKWI DISTRIC | Toroma County | Magoro Town Council
KATAKWI DISTRIC | Toroma County | Omodoi Subcounty
KATAKWI DISTRIC | Toroma County | Toroma Subcounty
KATAKWI DISTRIC | Toroma County | Toroma Town Council
KATAKWI DISTRIC | Usuk County | Guyaguya Subcounty
KATAKWI DISTRIC | Usuk County | Okulonyo Subcounty
KATAKWI DISTRIC | Usuk County | Ongongoja Subcounty
KATAKWI DISTRIC | Usuk County | Usuk Subcounty
KATAKWI DISTRIC | Usuk County | Usuk Town Council
TORORO | Tororo Municipality | Tororo Eastern Subcounty
TORORO | Tororo Municipality | Tororo Western Subcounty
TORORO | Tororo North County | Akadot Subcounty
TORORO | Tororo North County | Apetai Subcounty
TORORO | Tororo North County | Magodes Town Council
TORORO | Tororo North County | Merikit Subcounty
TORORO | Tororo North County | Merikit Town Council
TORORO | Tororo North County | Molo Subcounty
TORORO | Tororo North County | Mukuju Subcounty
TORORO | Tororo South County | Apokor Town Council
TORORO | Tororo South County | Kalait Subcounty
TORORO | Tororo South County | Kayoro Subcounty
TORORO | Tororo South County | Kwapa Subcounty
TORORO | Tororo South County | Kwapa Town Council
TORORO | Tororo South County | Malaba Town Council
TORORO | Tororo South County | Mella Subcounty
TORORO | Tororo South County | Morukatipe Subcounty
TORORO | Tororo South County | Osukuru Town Council
TORORO | West Budama Central County | Mulanda Subcounty
TORORO | West Budama Central County | Mwello Subcounty
TORORO | West Budama Central County | Nabuyoga Subcounty
TORORO | West Budama Central County | Nabuyoga Town Council
TORORO | West Budama Central County | Pajwenda Town Council
TORORO | West Budama Central County | Siwa Subcounty
TORORO | West Budama County | Iyolwa Subcounty
TORORO | West Budama County | Iyolwa Town Council
TORORO | West Budama County | Katajula Subcounty
TORORO | West Budama County | Kisoko Subcounty
TORORO | West Budama County | Magola Subcounty
TORORO | West Budama County | Nagongera Subcounty
TORORO | West Budama County | Nagongera Town Council
TORORO | West Budama County | Nyangole Subcounty
TORORO | West Budama County | Ojilai Subcounty
TORORO | West Budama County | Osia Subcounty
TORORO | West Budama County | Petta Subcounty
TORORO | West Budama County | Rubongi Subcounty
TORORO | West Budama North East County | Kirewa Subcounty
TORORO | West Budama North East County | Nawire Subcounty
TORORO | West Budama North East County | Paya Subcounty
TORORO | West Budama North East County | Sere Subcounty
TORORO | West Budama North East County | Soni Subcounty
TORORO | West Budama North East County | Sopsop Subcounty
`;

const WESTERN_REGION_DATASET = `
KISORO | Bufumbira County | Bunagana Town Council
KISORO | Bufumbira County | Busanza Subcounty
KISORO | Bufumbira County | Chahafi Town Council
KISORO | Bufumbira County | Chahi Subcounty
KISORO | Bufumbira County | Cyanika Town Council
KISORO | Bufumbira County | Kanaba Subcounty
KISORO | Bufumbira County | Mupaka Town Council
KISORO | Bufumbira County | Muramba Subcounty
KISORO | Bufumbira County | Murora Subcounty
KISORO | Bufumbira County | Nyakabande Subcounty
KISORO | Bufumbira County | Nyakinama Subcounty
KISORO | Bufumbira County | Nyarubuye Subcounty
KISORO | Bufumbira County | Nyarusiza Subcounty
KISORO | Bufumbira County | Rukundo Town Council
KISORO | Bukimbiri County | Bukimbiri Subcounty
KISORO | Bukimbiri County | Kirundo Subcounty
KISORO | Bukimbiri County | Nkuringo Town Council
KISORO | Bukimbiri County | Nyabwishenya Subcounty
KISORO | Bukimbiri County | Nyanamo Town Council
KISORO | Bukimbiri County | Nyundo Subcounty
KISORO | Bukimbiri County | Rubuguri Town Council
KISORO | Kisoro Municipality | Kisoro Central Division
KISORO | Kisoro Municipality | Kisoro North Division
KISORO | Kisoro Municipality | Kisoro South Division
HOIMA | Bugahya County | Buhanika Subcounty
HOIMA | Bugahya County | Bulindi Town Council
HOIMA | Bugahya County | Buraru Subcounty
HOIMA | Bugahya County | Buseruka Subcounty
HOIMA | Bugahya County | Kabaale Subcounty
HOIMA | Bugahya County | Kitoba Subcounty
HOIMA | Bugahya County | Kyabigambire Subcounty
HOIMA | Kigorobya County | Bombo Subcounty
HOIMA | Kigorobya County | Kapaapi Subcounty
HOIMA | Kigorobya County | Kiganja Subcounty
HOIMA | Kigorobya County | Kigorobya Subcounty
HOIMA | Kigorobya County | Kigorobya Town Council
HOIMA | Kigorobya County | Kijongo Subcounty
HOIMA | Kigorobya County | Kisukuma Subcounty
HOIMA CITY | Hoima East Division | Hoima East Division
HOIMA CITY | Hoima West Division | Hoima West Division
KAKUMIRO | Bugangaizi East County | Katikara Subcounty
KAKUMIRO | Bugangaizi East County | Kibijjo Subcounty
KAKUMIRO | Bugangaizi East County | Kisiita Subcounty
KAKUMIRO | Bugangaizi East County | Kisiita Town Council
KAKUMIRO | Bugangaizi East County | Mpasaana Subcounty
KAKUMIRO | Bugangaizi East County | Mpasaana Town Council
KAKUMIRO | Bugangaizi East County | Mwitanzige Subcounty
KAKUMIRO | Bugangaizi East County | Nkooko Subcounty
KAKUMIRO | Bugangaizi East County | Nkooko Town Council
KAKUMIRO | Bugangaizi South County | Birembo Subcounty
KAKUMIRO | Bugangaizi South County | Bwanswa Subcounty
KAKUMIRO | Bugangaizi South County | Igayaza Town Council
KAKUMIRO | Bugangaizi South County | Kakumiro Town Council
KAKUMIRO | Bugangaizi South County | Kasambya Subcounty
KAKUMIRO | Bugangaizi South County | Kisengwe Subcounty
KAKUMIRO | Bugangaizi South County | Kyabasaija Subcounty
KAKUMIRO | Bugangaizi West County | Kakindo Subcounty
KAKUMIRO | Bugangaizi West County | Kakindo Town Council
KAKUMIRO | Bugangaizi West County | Kijangi Subcounty
KAKUMIRO | Bugangaizi West County | Kikoora Subcounty
KAKUMIRO | Bugangaizi West County | Kikwaya Subcounty
KAKUMIRO | Bugangaizi West County | Kitaihuka Subcounty
KAKUMIRO | Bugangaizi West County | Nalweyo Subcounty
KAKUMIRO | Bugangaizi West County | Nyarweyo Town Council
BUNDIBUGYO | Bughendera County | Bukonzo Subcounty
BUNDIBUGYO | Bughendera County | Burondo Subcounty
BUNDIBUGYO | Bughendera County | Butama-Mitunda Town Council
BUNDIBUGYO | Bughendera County | Harugali Subcounty
BUNDIBUGYO | Bughendera County | Kagugu Subcounty
BUNDIBUGYO | Bughendera County | Kasitu Subcounty
BUNDIBUGYO | Bughendera County | Mabere Subcounty
BUNDIBUGYO | Bughendera County | Mbatya Subcounty
BUNDIBUGYO | Bughendera County | Ndugutu Subcounty
BUNDIBUGYO | Bughendera County | Ngamba Subcounty
BUNDIBUGYO | Bughendera County | Ngite Subcounty
BUNDIBUGYO | Bughendera County | Ntandi Town Council
BUNDIBUGYO | Bughendera County | Ntotoro Subcounty
BUNDIBUGYO | Bughendera County | Sindila Subcounty
BUNDIBUGYO | Bwamba County | Bubandi Subcounty
BUNDIBUGYO | Bwamba County | Bubukwanga Subcounty
BUNDIBUGYO | Bwamba County | Buganikere Town Council
BUNDIBUGYO | Bwamba County | Bundibugyo Town Council
BUNDIBUGYO | Bwamba County | Bundingoma Subcounty
BUNDIBUGYO | Bwamba County | Busaru Subcounty
BUNDIBUGYO | Bwamba County | Busunga Town Council
BUNDIBUGYO | Bwamba County | Kaghema Town Council
BUNDIBUGYO | Bwamba County | Kirumya Subcounty
BUNDIBUGYO | Bwamba County | Kisubba Subcounty
BUNDIBUGYO | Bwamba County | Mirambi Subcounty
BUNDIBUGYO | Bwamba County | Nyahuka Town Council
BUNDIBUGYO | Bwamba County | Tokwe Subcounty
KIKUUBE | Buhaguzi County | Kabwoya Subcounty
KIKUUBE | Buhaguzi County | Kikuube Town Council
KIKUUBE | Buhaguzi County | Kiziranfumbi Subcounty
KIKUUBE | Buhaguzi County | Kyangwali Subcounty
KIKUUBE | Buhaguzi County | Kyangwali Refugee Settlement Camp
KIKUUBE | Buhaguzi East County | Bugambe Subcounty
KIKUUBE | Buhaguzi East County | Buhimba Subcounty
KIKUUBE | Buhaguzi East County | Buhimba Town Council
BUHWEJU | Buhweju County | Bitsya Subcounty
BUHWEJU | Buhweju County | Buhunga Subcounty
BUHWEJU | Buhweju County | Karungu Subcounty
BUHWEJU | Buhweju County | Kashenyi-Kajani Town Council
BUHWEJU | Buhweju County | Nsiika Town Council
BUHWEJU | Buhweju County | Rwengwe Subcounty
BUHWEJU | Buhweju West County | Bihanga Subcounty
BUHWEJU | Buhweju West County | Burere Subcounty
BUHWEJU | Buhweju West County | Engaju Subcounty
BUHWEJU | Buhweju West County | Kyahenda Subcounty
BUHWEJU | Buhweju West County | Nyakashaka Town Council
BUHWEJU | Buhweju West County | Nyakaziba Town Council
BUHWEJU | Buhweju West County | Nyakishana Subcounty
BUHWEJU | Buhweju West County | Rubengye Subcounty
MASINDI | Bujenje County | Bikonzi Subcounty
MASINDI | Bujenje County | Budongo Subcounty
MASINDI | Bujenje County | Bulima Town Council
MASINDI | Bujenje County | Bwijanga Subcounty
MASINDI | Bujenje County | Kabango Town Council
MASINDI | Bujenje County | Nyantonzi Subcounty
MASINDI | Buruli County | Kijunjubwa Subcounty
MASINDI | Buruli County | Kijunjubwa Town Council
MASINDI | Buruli County | Kimengo Subcounty
MASINDI | Buruli County | Kiruli Subcounty
MASINDI | Buruli County | Kyatiri Town Council
MASINDI | Buruli County | Labongo Subcounty
MASINDI | Buruli County | Miirya Subcounty
MASINDI | Buruli County | Pakanyi Subcounty
MASINDI | Masindi Municipality | Karujubu Division
MASINDI | Masindi Municipality | Kigulya Division
MASINDI | Masindi Municipality | Masindi Central Division
MASINDI | Masindi Municipality | Nyangahya Division
ISINGIRO | Bukanga County | Bugango Town Council
ISINGIRO | Bukanga County | Endiinzi Town Council
ISINGIRO | Bukanga County | Endinzi Subcounty
ISINGIRO | Bukanga County | Mbaare Subcounty
ISINGIRO | Bukanga County | Rwanjogyera Subcounty
ISINGIRO | Bukanga North County | Kakamba Subcounty
ISINGIRO | Bukanga North County | Kashumba Subcounty
ISINGIRO | Bukanga North County | Nakivale Basecamp Refugee Camp
ISINGIRO | Bukanga North County | Nakivale-Juru Refugee Camp
ISINGIRO | Bukanga North County | Nakivale-Rubondo Refugee Camp
ISINGIRO | Bukanga North County | Ngarama Subcounty
ISINGIRO | Bukanga North County | Rugaaga Subcounty
ISINGIRO | Bukanga North County | Rugaaga Town Council
ISINGIRO | Bukanga North County | Rushasha Subcounty
ISINGIRO | Isingiro County | Birere Subcounty
ISINGIRO | Isingiro County | Isingiro Town Council
ISINGIRO | Isingiro County | Kaberebere Town Council
ISINGIRO | Isingiro County | Kabingo Subcounty
ISINGIRO | Isingiro County | Kagarama Subcounty
ISINGIRO | Isingiro County | Kamubeizi Town Council
ISINGIRO | Isingiro County | Kamubeizi Subcounty
ISINGIRO | Isingiro County | Kikagate Subcounty
ISINGIRO | Isingiro County | Kikagate Town Council
ISINGIRO | Isingiro County | Masha Subcounty
ISINGIRO | Isingiro County | Ntungu Subcounty
ISINGIRO | Isingiro County | Nyakitunda Subcounty
ISINGIRO | Isingiro County | Nyamuyanja Subcounty
ISINGIRO | Isingiro County | Ruyanga Subcounty
ISINGIRO | Isingiro County | Rwetango Subcounty
ISINGIRO | Isingiro West County | Kabuyanda Subcounty
ISINGIRO | Isingiro West County | Kabuyanda Town Council
ISINGIRO | Isingiro West County | Ruborogota Subcounty
ISINGIRO | Isingiro West County | Ruhiira Town Council
KASESE | Bukonjo County | Bwera Subcounty
KASESE | Bukonjo County | Ihandiro Subcounty
KASESE | Bukonjo County | Isango Subcounty
KASESE | Bukonjo County | Karambi Subcounty
KASESE | Bukonjo County | Kinyameseke Town Council
KASESE | Bukonjo County | Kisinga Subcounty
KASESE | Bukonjo County | Kisinga Town Council
KASESE | Bukonjo County | Kitabu Subcounty
KASESE | Bukonjo County | Kitholu Subcounty
KASESE | Bukonjo County | Kithoma-Kanyatsi Town Council
KASESE | Bukonjo County | Kyarumba Subcounty
KASESE | Bukonjo County | Kyarumba Town Council
KASESE | Bukonjo County | Kyondo Subcounty
KASESE | Bukonjo County | Mahango Subcounty
KASESE | Bukonjo County | Mpondwe-Lhubiriha Town Council
KASESE | Bukonjo County | Munkunyu Subcounty
KASESE | Bukonjo County | Nyakatonzi Subcounty
KASESE | Bukonjo County | Nyakiyumbu Subcounty
KASESE | Busongora County | Bugoye Subcounty
KASESE | Busongora County | Buhuhira Subcounty
KASESE | Busongora County | Bwesumbu Subcounty
KASESE | Busongora County | Hima Town Council
KASESE | Busongora County | Ibanda-Kyanya Town Council
KASESE | Busongora County | Kabatunda-Kirabaho Town Council
KASESE | Busongora County | Kahokya Subcounty
KASESE | Busongora County | Karusandara Subcounty
KASESE | Busongora County | Katwe-Kabatoro Town Council
KASESE | Busongora County | Kilembe Subcounty
KASESE | Busongora County | Kitswamba Subcounty
KASESE | Busongora County | Kitswamba Town Council
KASESE | Busongora County | Kyabarungira Subcounty
KASESE | Busongora County | Lake Katwe Subcounty
KASESE | Busongora County | Maliba Subcounty
KASESE | Busongora County | Maliba Town Council
KASESE | Busongora County | Mbunga Subcounty
KASESE | Busongora County | Mubuku Town Council
KASESE | Busongora County | Muhokya Subcounty
KASESE | Busongora County | Muhokya Town Council
KASESE | Busongora County | Nyakabingo Subcounty
KASESE | Busongora County | Rugendabara-Kikongo Town Council
KASESE | Busongora County | Rukoki Subcounty
KASESE | Kasese Municipality | Bulembia Division
KASESE | Kasese Municipality | Kasese Central Division
KASESE | Kasese Municipality | Nyamwamba Division
BULIISA | Buliisa County | Biiso Subcounty
BULIISA | Buliisa County | Biiso Town Council
BULIISA | Buliisa County | Buliisa Subcounty
BULIISA | Buliisa County | Buliisa Town Council
BULIISA | Buliisa County | Butiaba Subcounty
BULIISA | Buliisa County | Butiaba Town Council
BULIISA | Buliisa County | Kigwera Subcounty
BULIISA | Buliisa County | Kihungya Subcounty
BULIISA | Buliisa County | Ngwedo Subcounty
BULIISA | Buliisa County | Wanseko Town Council
BUNYANGABU | Bunyangabu County | Buheesi Subcounty
BUNYANGABU | Bunyangabu County | Buheesi Town Council
BUNYANGABU | Bunyangabu County | Bukara Subcounty
BUNYANGABU | Bunyangabu County | Kabonero Subcounty
BUNYANGABU | Bunyangabu County | Kakinga Town Council
BUNYANGABU | Bunyangabu County | Kateebwa Subcounty
BUNYANGABU | Bunyangabu County | Kibiito Subcounty
BUNYANGABU | Bunyangabu County | Kibiito Town Council
BUNYANGABU | Bunyangabu County | Kisomoro Subcounty
BUNYANGABU | Bunyangabu County | Kiyombya Subcounty
BUNYANGABU | Bunyangabu County | Kyamukube Town Council
BUNYANGABU | Bunyangabu County | Nyakigumba Town Council
BUNYANGABU | Bunyangabu County | Rubona Town Council
BUNYANGABU | Bunyangabu County | Rwimi Subcounty
BUNYANGABU | Bunyangabu County | Rwimi Town Council
RUBIRIZI | Bunyaruguru County | Katunguru Subcounty
RUBIRIZI | Bunyaruguru County | Kichwamba Subcounty
RUBIRIZI | Bunyaruguru County | Magambo Subcounty
RUBIRIZI | Bunyaruguru County | Rubirizi Town Council
RUBIRIZI | Bunyaruguru County | Rutoto Subcounty
RUBIRIZI | Bunyaruguru County | Ryeru Subcounty
RUBIRIZI | Katerera County | Katanda Subcounty
RUBIRIZI | Katerera County | Katerera Subcounty
RUBIRIZI | Katerera County | Katerera Town Council
RUBIRIZI | Katerera County | Kirugu Subcounty
RUBIRIZI | Katerera County | Kyabakara Subcounty
KABAROLE | Burahya County | Busoro Subcounty
KABAROLE | Burahya County | Hakibale Subcounty
KABAROLE | Burahya County | Harugongo Subcounty
KABAROLE | Burahya County | Kabende Subcounty
KABAROLE | Burahya County | Karangura Subcounty
KABAROLE | Burahya County | Kasenda Subcounty
KABAROLE | Burahya County | Kasenda Town Council
KABAROLE | Burahya County | Kibasi Town Council
KABAROLE | Burahya County | Kichwamba Subcounty
KABAROLE | Burahya County | Kijura Town Council
KABAROLE | Burahya County | Kiko Town Council
KABAROLE | Burahya County | Mugusu Subcounty
KABAROLE | Burahya County | Mugusu Town Council
KABAROLE | Burahya County | Ruteete Subcounty
KABAROLE | Burahya County | Rwengaju Subcounty
BUSHENYI | Bushenyi-Ishaka Municipality | Bushenyi Central Division
BUSHENYI | Bushenyi-Ishaka Municipality | Ishaka Division
BUSHENYI | Bushenyi-Ishaka Municipality | Nyakabirizi Division
BUSHENYI | Igara County | Bitooma Town Council
BUSHENYI | Igara County | Bumbaire Subcounty
BUSHENYI | Igara County | Ibaare Subcounty
BUSHENYI | Igara County | Kakanju Subcounty
BUSHENYI | Igara County | Kazinda Town Council
BUSHENYI | Igara County | Kyabugimbi Town Council
BUSHENYI | Igara County | Kyabugimbi Subcounty
BUSHENYI | Igara County | Kyamuhunga Town Council
BUSHENYI | Igara County | Kyamuhunga Subcounty
BUSHENYI | Igara County | Kyeizooba Subcounty
BUSHENYI | Igara County | Nkanga Subcounty
BUSHENYI | Igara County | Nyabubare Subcounty
BUSHENYI | Igara County | Ruhumuro Subcounty
BUSHENYI | Igara County | Rwentuha Town Council
KAGADI | Buyaga East County | Isunga Subcounty
KAGADI | Buyaga East County | Kabamba Subcounty
KAGADI | Buyaga East County | Kagadi Subcounty
KAGADI | Buyaga East County | Kagadi Town Council
KAGADI | Buyaga East County | Kamuroza Subcounty
KAGADI | Buyaga East County | Kicucura Subcounty
KAGADI | Buyaga East County | Kinyarugonjo Subcounty
KAGADI | Buyaga East County | Kiryanga Subcounty
KAGADI | Buyaga East County | Kyanaisoke Subcounty
KAGADI | Buyaga East County | Kyenzige Subcounty
KAGADI | Buyaga East County | Kyenzige Town Council
KAGADI | Buyaga East County | Mabaale Subcounty
KAGADI | Buyaga East County | Mabaale Town Council
KAGADI | Buyaga East County | Nyabutanzi Subcounty
KAGADI | Buyaga East County | Pachwa Subcounty
KAGADI | Buyaga East County | Pachwa Town Council
KAGADI | Buyaga West County | Buhumuliro Subcounty
KAGADI | Buyaga West County | Burora Subcounty
KAGADI | Buyaga West County | Bwikara Subcounty
KAGADI | Buyaga West County | Galiboleka Subcounty
KAGADI | Buyaga West County | Kanyabeebe Subcounty
KAGADI | Buyaga West County | Kyakabadiima Subcounty
KAGADI | Buyaga West County | Kyaterekera Subcounty
KAGADI | Buyaga West County | Kyaterekera Town Council
KAGADI | Buyaga West County | Mairirwe Subcounty
KAGADI | Buyaga West County | Mpeefu Subcounty
KAGADI | Buyaga West County | Mpeefu Ya Sande Town Council
KAGADI | Buyaga West County | Muhorro Subcounty
KAGADI | Buyaga West County | Muhorro Town Council
KAGADI | Buyaga West County | Ndaiga Subcounty
KAGADI | Buyaga West County | Nyakarongo Subcounty
KAGADI | Buyaga West County | Rugashari Subcounty
KAGADI | Buyaga West County | Rugashari Town Council
KAGADI | Buyaga West County | Ruteete Subcounty
KAGADI | Buyaga West County | Rutete Town Council
KIBAALE | Buyanja County | Bubango Subcounty
KIBAALE | Buyanja County | Bwamiramira Subcounty
KIBAALE | Buyanja County | Kabasekende Subcounty
KIBAALE | Buyanja County | Kibaale Town Council
KIBAALE | Buyanja County | Kyakazihire Subcounty
KIBAALE | Buyanja County | Mugarama Subcounty
KIBAALE | Buyanja County | Nyamarunda Subcounty
KIBAALE | Buyanja County | Nyamarunda Town Council
KIBAALE | Buyanja East County | Karama Subcounty
KIBAALE | Buyanja East County | Kasimbi Subcounty
KIBAALE | Buyanja East County | Kayanja Subcounty
KIBAALE | Buyanja East County | Kyebando Subcounty
KIBAALE | Buyanja East County | Matale Subcounty
KIBAALE | Buyanja East County | Nyamarwa Subcounty
FORT PORTAL CITY | Fort Portal Central Division | Fort Portal Central Division
FORT PORTAL CITY | Fort Portal North Division | Fort Portal North Division
IBANDA | Ibanda Municipality | Bisheshe Division
IBANDA | Ibanda Municipality | Bufunda Division
IBANDA | Ibanda Municipality | Kagongo Division
IBANDA | Ibanda County | Igorora Town Council
IBANDA | Ibanda County | Ishongororo Subcounty
IBANDA | Ibanda County | Ishongororo Town Council
IBANDA | Ibanda County | Kanyarugiri Town Council
IBANDA | Ibanda County | Keihangara Subcounty
IBANDA | Ibanda County | Kicuzi Subcounty
IBANDA | Ibanda County | Kijongo Subcounty
IBANDA | Ibanda County | Kikyenkye Subcounty
IBANDA | Ibanda County | Nyabuhikye Subcounty
IBANDA | Ibanda County | Nyamarebe Subcounty
IBANDA | Ibanda County | Rukiri Subcounty
IBANDA | Ibanda County | Rushango Town Council
IBANDA | Ibanda County | Rwenkobwa Town Council
KABALE | Kabale Municipality | Kabale Central Subcounty
KABALE | Kabale Municipality | Kabale Northern Subcounty
KABALE | Kabale Municipality | Kabale Southern Subcounty
KABALE | Ndorwa County | Buhara Subcounty
KABALE | Ndorwa County | Butanda Subcounty
KABALE | Ndorwa County | Kaharo Subcounty
KABALE | Ndorwa County | Kahungye Subcounty
KABALE | Ndorwa County | Kamuganguzi Subcounty
KABALE | Ndorwa County | Katuna Town Council
KABALE | Ndorwa County | Kibuga Subcounty
KABALE | Ndorwa County | Kitumba Subcounty
KABALE | Ndorwa County | Kyanamira Subcounty
KABALE | Ndorwa County | Maziba Subcounty
KABALE | Ndorwa County | Rubaya Subcounty
KABALE | Ndorwa County | Ryakarimira Town Council
NTUNGAMO | Kajara County | Bwongyera Subcounty
NTUNGAMO | Kajara County | Ihunga Subcounty
NTUNGAMO | Kajara County | Kagarama Town Council
NTUNGAMO | Kajara County | Kibatsi Subcounty
NTUNGAMO | Kajara County | Nyabihoko Subcounty
NTUNGAMO | Kajara County | Nyabushenyi Subcounty
NTUNGAMO | Kajara County | Nyamunuka Town Council
NTUNGAMO | Kajara County | Rwamabondo Town Council
NTUNGAMO | Kajara County | Rwashameire Town Council
NTUNGAMO | Ntungamo Municipality | Ntungamo Central Division
NTUNGAMO | Ntungamo Municipality | Ntungamo Eastern Division
NTUNGAMO | Ntungamo Municipality | Ntungamo Western Division
NTUNGAMO | Ruhaama County | Itojo Subcounty
NTUNGAMO | Ruhaama County | Kafunjo-Mirama Town Council
NTUNGAMO | Ruhaama County | Kakukuru-Rwenanura Town Council
NTUNGAMO | Ruhaama County | Ntungamo Subcounty
NTUNGAMO | Ruhaama County | Nyamukana Town Council
NTUNGAMO | Ruhaama County | Nyarutuntu Subcounty
NTUNGAMO | Ruhaama County | Ruhaama Subcounty
NTUNGAMO | Ruhaama County | Ruhaama East Subcounty
NTUNGAMO | Ruhaama County | Rweikiniro Subcounty
NTUNGAMO | Ruhaama East County | Kitwe Town Council
NTUNGAMO | Ruhaama East County | Nyakyera Subcounty
NTUNGAMO | Ruhaama East County | Nyakyera Town Council
NTUNGAMO | Ruhaama East County | Rukoni East Subcounty
NTUNGAMO | Ruhaama East County | Rukoni West Subcounty
NTUNGAMO | Ruhaama East County | Rwoho Town Council
NTUNGAMO | Rushenyi County | Kayonza Subcounty
NTUNGAMO | Rushenyi County | Ngoma Subcounty
NTUNGAMO | Rushenyi County | Rubaare Subcounty
NTUNGAMO | Rushenyi County | Rubaare Town Council
NTUNGAMO | Rushenyi County | Rugarama Subcounty
NTUNGAMO | Rushenyi County | Rugarama North Subcounty
NTUNGAMO | Rushenyi County | Rwentobo-Rwahi Town Council
MBARARA | Kashari North County | Kagongi Subcounty
MBARARA | Kashari North County | Kashare Subcounty
MBARARA | Kashari North County | Nyabisirira Town Council
MBARARA | Kashari North County | Rubindi Subcounty
MBARARA | Kashari North County | Rubindi-Ruhumba Town Council
MBARARA | Kashari South County | Bubaare Subcounty
MBARARA | Kashari South County | Bukiiro Subcounty
MBARARA | Kashari South County | Bukiiro Town Council
MBARARA | Kashari South County | Bwizibwera-Rutooma Town Council
MBARARA | Kashari South County | Rubaya Subcounty
MBARARA | Kashari South County | Rwanyamahembe Town Council
MBARARA CITY | Mbarara North Division | Mbarara North Division
MBARARA CITY | Mbarara South Division | Mbarara South Division
KIRUHURA | Kashongi County | Kashongi Subcounty
KIRUHURA | Kashongi County | Kitura Subcounty
KIRUHURA | Kazo County | Buremba Town Council
KIRUHURA | Kazo County | Burunga Subcounty
KIRUHURA | Kazo County | Engari Subcounty
KIRUHURA | Kazo County | Kanoni Subcounty
KIRUHURA | Kazo County | Kazo Subcounty
KIRUHURA | Kazo County | Kazo Town Council
KIRUHURA | Kazo County | Kyampangara Subcounty
KIRUHURA | Kazo County | Migina Subcounty
KIRUHURA | Kazo County | Nkungu Subcounty
KIRUHURA | Kazo County | Rwemikoma Subcounty
KIRUHURA | Nyabushozi County | Akayanja Subcounty
KIRUHURA | Nyabushozi County | Kanyaryeru Subcounty
KIRUHURA | Nyabushozi County | Kenshunga Subcounty
KIRUHURA | Nyabushozi County | Kikatsi Subcounty
KIRUHURA | Nyabushozi County | Kinoni Subcounty
KIRUHURA | Nyabushozi County | Kiruhura Town Council
KIRUHURA | Nyabushozi County | Nyakashashara Subcounty
KIRUHURA | Nyabushozi County | Rushere Town Council
KIRUHURA | Nyabushozi County | Rwenshande Subcounty
KIRUHURA | Nyabushozi County | Rwetamu Subcounty
KIRUHURA | Nyabushozi County | Sanga Subcounty
KIRUHURA | Nyabushozi County | Sanga Town Council
KAMWENGE | Kibale County | Bigodi Town Council
KAMWENGE | Kibale County | Busiriba Subcounty
KAMWENGE | Kibale County | Kabambiro Subcounty
KAMWENGE | Kibale County | Kabuga Town Council
KAMWENGE | Kibale County | Kahunge Town Council
KAMWENGE | Kibale County | Kahunge Subcounty
KAMWENGE | Kibale County | Kamwenge Subcounty
KAMWENGE | Kibale County | Kamwenge Town Council
KAMWENGE | Kibale County | Rukunyu Town Council
KAMWENGE | Kibale East County | Biguli Subcounty
KAMWENGE | Kibale East County | Biguli Town Council
KAMWENGE | Kibale East County | Bihanga Subcounty
KAMWENGE | Kibale East County | Bwizi Subcounty
KAMWENGE | Kibale East County | Kabuye Subcounty
KAMWENGE | Kibale East County | Lyakahungu Town Council
KAMWENGE | Kibale East County | Nkoma Subcounty
KAMWENGE | Kibale East County | Nkoma-Katalyeba Town Council
KAMWENGE | Kibale East County | Ntonwa Subcounty
KAMWENGE | Kibale East County | Rwamwanja Refugee Camp
KIRYANDONGO | Kibanda North County | Bweyale Town Council
KIRYANDONGO | Kibanda North County | Diima Subcounty
KIRYANDONGO | Kibanda North County | Karuma Town Council
KIRYANDONGO | Kibanda North County | Kichwabugingo Subcounty
KIRYANDONGO | Kibanda North County | Kiryandongo Subcounty
KIRYANDONGO | Kibanda North County | Kiryandongo Town Council
KIRYANDONGO | Kibanda North County | Kiryandongo Refugee Camp
KIRYANDONGO | Kibanda North County | Kyankende Subcounty
KIRYANDONGO | Kibanda North County | Mutunda Subcounty
KIRYANDONGO | Kibanda North County | Nyamahasa Subcounty
KIRYANDONGO | Kibanda South County | Kigumba Subcounty
KIRYANDONGO | Kibanda South County | Kigumba Town Council
KIRYANDONGO | Kibanda South County | Masindi Port Subcounty
KIRYANDONGO | Kibanda South County | Mboira Subcounty
KANUNGU | Kinkizi County | Bugongi Subcounty
KANUNGU | Kinkizi County | Buhoma Town Council
KANUNGU | Kinkizi County | Butogota Town Council
KANUNGU | Kinkizi County | Kambuga Subcounty
KANUNGU | Kinkizi County | Kambuga Town Council
KANUNGU | Kinkizi County | Kanungu Town Council
KANUNGU | Kinkizi County | Kanyantorogo Subcounty
KANUNGU | Kinkizi County | Kanyantorogo Town Council
KANUNGU | Kinkizi County | Katete Subcounty
KANUNGU | Kinkizi County | Kayonza Subcounty
KANUNGU | Kinkizi County | Kayungwe Subcounty
KANUNGU | Kinkizi County | Kihanda Subcounty
KANUNGU | Kinkizi County | Kihembe Subcounty
KANUNGU | Kinkizi County | Kihiihi Subcounty
KANUNGU | Kinkizi County | Kihiihi Town Council
KANUNGU | Kinkizi County | Kinaaba Subcounty
KANUNGU | Kinkizi County | Kirima Subcounty
KANUNGU | Kinkizi County | Kyeshero Subcounty
KANUNGU | Kinkizi County | Mpungu Subcounty
KANUNGU | Kinkizi County | Nyakabungo Town Council
KANUNGU | Kinkizi County | Nyakinoni Subcounty
KANUNGU | Kinkizi County | Nyamirama Subcounty
KANUNGU | Kinkizi County | Nyamirama Town Council
KANUNGU | Kinkizi County | Nyanga Subcounty
KANUNGU | Kinkizi County | Rugyeyo Subcounty
KANUNGU | Kinkizi County | Rutenga Subcounty
KANUNGU | Kinkizi County | Rutenga Town Council
KITAGWENDA | Kitagwenda County | Buhanda Subcounty
KITAGWENDA | Kitagwenda County | Bukurungo Town Council
KITAGWENDA | Kitagwenda County | Kabujogera Town Council
KITAGWENDA | Kitagwenda County | Kakasi Subcounty
KITAGWENDA | Kitagwenda County | Kanara Subcounty
KITAGWENDA | Kitagwenda County | Kicheche Subcounty
KITAGWENDA | Kitagwenda County | Kitagwenda Town Council
KITAGWENDA | Kitagwenda County | Mahyoro Subcounty
KITAGWENDA | Kitagwenda County | Mahyoro Town Council
KITAGWENDA | Kitagwenda County | Ntara Subcounty
KITAGWENDA | Kitagwenda County | Nyabbani Subcounty
KITAGWENDA | Kitagwenda County | Ruhunga Subcounty
KITAGWENDA | Kitagwenda County | Rwenjaza Subcounty
KYEGEGWA | Kyaka Central County | Kakabara Town Council
KYEGEGWA | Kyaka Central County | Kyaka II Refugee Camp
KYEGEGWA | Kyaka Central County | Kyatega Subcounty
KYEGEGWA | Kyaka Central County | Kyegegwa Subcounty
KYEGEGWA | Kyaka Central County | Kyegegwa Town Council
KYEGEGWA | Kyaka Central County | Nkanja Subcounty
KYEGEGWA | Kyaka North County | Bugogo Town Council
KYEGEGWA | Kyaka North County | Hapuuyo Subcounty
KYEGEGWA | Kyaka North County | Hapuuyo Town Council
KYEGEGWA | Kyaka North County | Kakabara Subcounty
KYEGEGWA | Kyaka North County | Kasule Subcounty
KYEGEGWA | Kyaka North County | Kigambo Subcounty
KYEGEGWA | Kyaka North County | Migongwe Subcounty
KYEGEGWA | Kyaka North County | Nkaakwa Subcounty
KYEGEGWA | Kyaka South County | Kazinga Town Council
KYEGEGWA | Kyaka South County | Migamba Subcounty
KYEGEGWA | Kyaka South County | Mpara Subcounty
KYEGEGWA | Kyaka South County | Mpara Town Council
KYEGEGWA | Kyaka South County | Ruyonza Subcounty
KYEGEGWA | Kyaka South County | Rwentuha Subcounty
KYENJOJO | Mwenge Central County | Bugaaki Subcounty
KYENJOJO | Mwenge Central County | Katooke Subcounty
KYENJOJO | Mwenge Central County | Katooke Town Council
KYENJOJO | Mwenge Central County | Kyarusozi Subcounty
KYENJOJO | Mwenge Central County | Kyarusozi Town Council
KYENJOJO | Mwenge Central County | Nyakisi Subcounty
KYENJOJO | Mwenge Central County | Rugombe Town Council
KYENJOJO | Mwenge County | Batalika Subcounty
KYENJOJO | Mwenge County | Bufunjo Subcounty
KYENJOJO | Mwenge County | Butiiti Subcounty
KYENJOJO | Mwenge County | Butiiti Town Council
KYENJOJO | Mwenge County | Butunduzi Subcounty
KYENJOJO | Mwenge County | Butunduzi Town Council
KYENJOJO | Mwenge County | Kanyegaramire Subcounty
KYENJOJO | Mwenge County | Kifuka Town Council
KYENJOJO | Mwenge County | Kigaraale Subcounty
KYENJOJO | Mwenge County | Kigoyera Subcounty
KYENJOJO | Mwenge County | Kihuura Subcounty
KYENJOJO | Mwenge County | Kisojo Subcounty
KYENJOJO | Mwenge County | Kisojo Town Council
KYENJOJO | Mwenge County | Kitega Subcounty
KYENJOJO | Mwenge County | Kyakatwire Town Council
KYENJOJO | Mwenge County | Kyamutunzi Town Council
KYENJOJO | Mwenge County | Kyembogo Subcounty
KYENJOJO | Mwenge County | Kyenjojo Town Council
KYENJOJO | Mwenge County | Mabira Town Council
KYENJOJO | Mwenge County | Mbale Town Council
KYENJOJO | Mwenge County | Nyabirongo Subcounty
KYENJOJO | Mwenge County | Nyabuharwa Subcounty
KYENJOJO | Mwenge County | Nyankwanzi Subcounty
KYENJOJO | Mwenge County | Nyantungo Subcounty
NTOROKO | Ntoroko County | Butungama Subcounty
NTOROKO | Ntoroko County | Bweramule Subcounty
NTOROKO | Ntoroko County | Kanara Subcounty
NTOROKO | Ntoroko County | Kanara Town Council
NTOROKO | Ntoroko County | Karugutu Subcounty
NTOROKO | Ntoroko County | Karugutu Town Council
NTOROKO | Ntoroko County | Kibuuku Town Council
NTOROKO | Ntoroko County | Nombe Subcounty
NTOROKO | Ntoroko County | Rwebisengo Subcounty
NTOROKO | Ntoroko County | Rwebisengo Town Council
RUKUNGIRI | Rubabo County | Buyanja Subcounty
RUKUNGIRI | Rubabo County | Buyanja Town Council
RUKUNGIRI | Rubabo County | Kebisoni Subcounty
RUKUNGIRI | Rubabo County | Kebisoni Town Council
RUKUNGIRI | Rubabo County | Nyakishenyi Subcounty
RUKUNGIRI | Rubabo County | Nyarushanje Subcounty
RUKUNGIRI | Rujumbura County | Bikurungu Town Council
RUKUNGIRI | Rujumbura County | Bugangari Subcounty
RUKUNGIRI | Rujumbura County | Buhunga Subcounty
RUKUNGIRI | Rujumbura County | Bwambara Subcounty
RUKUNGIRI | Rujumbura County | Nyakagyeme Subcounty
RUKUNGIRI | Rujumbura County | Ruhinda Subcounty
RUKUNGIRI | Rujumbura County | Rwerere Town Council
RUKUNGIRI | Rukungiri Municipality | Rukungiri Eastern Division
RUKUNGIRI | Rukungiri Municipality | Rukungiri Southern Division
RUKUNGIRI | Rukungiri Municipality | Rukungiri Western Division
RUBANDA | Rubanda County | Bubaare Town Council
RUBANDA | Rubanda County | Bubare Subcounty
RUBANDA | Rubanda County | Bufundi Subcounty
RUBANDA | Rubanda County | Butare-Katojo Town Council
RUBANDA | Rubanda County | Habuhutu Town Council
RUBANDA | Rubanda County | Hamuhambo Town Council
RUBANDA | Rubanda County | Hamurwa Subcounty
RUBANDA | Rubanda County | Hamurwa Town Council
RUBANDA | Rubanda County | Ikumba Subcounty
RUBANDA | Rubanda County | Kacerere Town Council
RUBANDA | Rubanda County | Kashasha Town Council
RUBANDA | Rubanda County | Muko Subcounty
RUBANDA | Rubanda County | Nshanjare Town Council
RUBANDA | Rubanda County | Nyamweeru Subcounty
RUBANDA | Rubanda County | Rubanda Town Council
RUBANDA | Rubanda County | Ruhija Subcounty
RUBANDA | Rubanda County | Ruhija Town Council
RUKIGA | Rukiga County | Rukinda Subcounty
RUKIGA | Rukiga County | Kamwezi Subcounty
RUKIGA | Rukiga County | Kashambya Subcounty
RUKIGA | Rukiga County | Mparo Town Council
RUKIGA | Rukiga County | Muhanga Town Council
RUKIGA | Rukiga County | Rwamucucu Subcounty
MITOOMA | Ruhinda County | Kashenshero Subcounty
MITOOMA | Ruhinda County | Kashenshero Town Council
MITOOMA | Ruhinda County | Katenga Subcounty
MITOOMA | Ruhinda County | Mitooma Subcounty
MITOOMA | Ruhinda County | Mitooma Town Council
MITOOMA | Ruhinda North County | Bitereko Subcounty
MITOOMA | Ruhinda North County | Kanyabwanga Subcounty
MITOOMA | Ruhinda North County | Kigyende Subcounty
MITOOMA | Ruhinda North County | Kiyanga Subcounty
MITOOMA | Ruhinda North County | Rutookye Town Council
MITOOMA | Ruhinda North County | Rwoburunga Subcounty
MITOOMA | Ruhinda South County | Kabira Subcounty
MITOOMA | Ruhinda South County | Kabira Town Council
MITOOMA | Ruhinda South County | Mayanga Subcounty
MITOOMA | Ruhinda South County | Mutara Subcounty
MITOOMA | Ruhinda South County | Mutara Town Council
MITOOMA | Ruhinda South County | Nyakizinga Subcounty
MITOOMA | Ruhinda South County | Rurehe Subcounty
RWAMPARA | Rwampara County | Buteraniro-Nyeihanga Town Council
RWAMPARA | Rwampara County | Kinoni Town Council
RWAMPARA | Rwampara County | Ndeija Subcounty
RWAMPARA | Rwampara County | Rugando Subcounty
RWAMPARA | Rwampara East County | Bugamba Subcounty
RWAMPARA | Rwampara East County | Kabura Town Council
RWAMPARA | Rwampara East County | Mwizi Subcounty
RWAMPARA | Rwampara East County | Rweibogo-Kibingo Town Council
SHEEMA | Sheema Municipality | Kabwohe Division
SHEEMA | Sheema Municipality | Kagango Division
SHEEMA | Sheema Municipality | Kashozi Division
SHEEMA | Sheema Municipality | Sheema Central Division
SHEEMA | Sheema County | Bugongi Town Council
SHEEMA | Sheema County | Kakindo Town Council
SHEEMA | Sheema County | Kasaana Subcounty
SHEEMA | Sheema County | Kigarama Subcounty
SHEEMA | Sheema County | Kitagata Subcounty
SHEEMA | Sheema County | Kitagata Town Council
SHEEMA | Sheema County | Kyangyenyi Subcounty
SHEEMA | Sheema County | Masheruka Subcounty
SHEEMA | Sheema County | Masheruka Town Council
SHEEMA | Sheema County | Rugarama Subcounty
SHEEMA | Sheema County | Shuuku Town Council
`;

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((part) => {
      if (!part.trim() || /[\s/-]/.test(part)) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function fixKnownNames(value) {
  const corrected = String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
  const corrections = {
    "MUBENDE MUICIPALITY": "Mubende Municipality",
    "NAKASEKE SOUTH COUTY": "Nakaseke South County",
    "MAWAOGOLA NORTH COUNTY": "Mawogola North County",
    "MADI OKOLLO": "Madi-Okollo",
    "AMUGU SUNCOUNTY": "Amugu Subcounty",
    "ATIK DIVISSION": "Atik Division",
    "DUFILE SUBCOUTY": "Dufile Subcounty",
    "TADEMERI SUBCOUTY": "Tademeri Subcounty",
    "BUYENDE TOWNN COUNCIL": "Buyende Town Council",
    "KUMI MUICIPALITY": "Kumi Municipality",
    "KATAKWI DISTRIC": "Katakwi",
    "KISENGWE SUBCOUTY": "Kisengwe Subcounty",
    "KAGADI DISTRICT": "Kagadi",
    "KISOJOTOWN COUNCIL": "Kisojo Town Council",
    "KAGANGO DIIVISION": "Kagango Division",
    "KYAKA II REFUGEE CAMP": "Kyaka II Refugee Camp"
  };

  if (corrections[corrected]) {
    return corrections[corrected];
  }

  return titleCase(corrected);
}

function normalizeName(value, fallback = "") {
  return fixKnownNames(String(value || fallback).trim());
}

function normalizeLookup(value) {
  return normalizeName(value).toLowerCase();
}

function normalizeCountry(value) {
  const normalized = String(value || UGANDA_COUNTRY_NAME).trim().toUpperCase();
  return normalized || UGANDA_COUNTRY_NAME;
}

function inferDistrictType(name) {
  return normalizeName(name).endsWith("City") ? "CITY" : "DISTRICT";
}

function inferAdministrativeUnitType(name) {
  const normalized = normalizeName(name);
  if (normalized.endsWith("Municipality")) {
    return "MUNICIPALITY";
  }
  if (normalized.endsWith("Division")) {
    return "DIVISION";
  }
  return "COUNTY";
}

function inferSubUnitType(name) {
  const normalized = normalizeName(name);
  if (
    normalized.includes("Island") ||
    normalized.includes("Islands") ||
    normalized === "Greek River (Kiriki)"
  ) {
    return "SPECIAL_AREA";
  }
  if (
    normalized.includes("Refugee Camp") ||
    normalized.includes("Refugee Settlement") ||
    normalized.includes("Settlement Camps")
  ) {
    return "REFUGEE_SETTLEMENT";
  }
  if (normalized.endsWith("Town Council")) {
    return "TOWN_COUNCIL";
  }
  if (normalized.endsWith("Division")) {
    return "DIVISION";
  }
  return "SUBCOUNTY";
}

function createFallbackDistrict(name) {
  return {
    district: normalizeName(name),
    type: inferDistrictType(name),
    administrativeUnits: [],
    subcounties: []
  };
}

function buildStructuredRegionCatalog(region, subregionDistricts, dataset) {
  const districtToSubregion = new Map();
  Object.entries(subregionDistricts).forEach(([subregion, districts]) => {
    districts.forEach((district) => districtToSubregion.set(normalizeLookup(district), normalizeName(subregion)));
  });

  const grouped = new Map();
  Object.entries(subregionDistricts).forEach(([subregion, districts]) => {
    const normalizedSubregion = normalizeName(subregion);
    grouped.set(normalizedSubregion, new Map(districts.map((district) => [normalizeLookup(district), createFallbackDistrict(district)])));
  });

  dataset.trim().split("\n").forEach((line) => {
    const [districtRaw, administrativeUnitRaw, subUnitRaw] = line.split("|").map((part) => part.trim());
    const district = normalizeName(districtRaw);
    const administrativeUnit = normalizeName(administrativeUnitRaw);
    const subUnit = normalizeName(subUnitRaw);
    const subregion = districtToSubregion.get(normalizeLookup(district));

    if (!subregion) {
      return;
    }

    const districtMap = grouped.get(subregion);
    if (!districtMap.has(normalizeLookup(district))) {
      districtMap.set(normalizeLookup(district), createFallbackDistrict(district));
    }

    const districtEntry = districtMap.get(normalizeLookup(district));
    let administrativeUnitEntry = districtEntry.administrativeUnits.find(
      (entry) => normalizeLookup(entry.name) === normalizeLookup(administrativeUnit)
    );

    if (!administrativeUnitEntry) {
      administrativeUnitEntry = {
        name: administrativeUnit,
        type: inferAdministrativeUnitType(administrativeUnit),
        subUnits: []
      };
      districtEntry.administrativeUnits.push(administrativeUnitEntry);
    }

    if (!administrativeUnitEntry.subUnits.some((entry) => normalizeLookup(entry.name) === normalizeLookup(subUnit))) {
      administrativeUnitEntry.subUnits.push({
        name: subUnit,
        type: inferSubUnitType(subUnit)
      });
    }
  });

  return {
    country: UGANDA_COUNTRY_NAME,
    region,
    subregions: Object.entries(subregionDistricts).map(([subregion]) => ({
      subregion: normalizeName(subregion),
      districts: Array.from(grouped.get(normalizeName(subregion)).values())
        .map((district) => ({
          ...district,
          administrativeUnits: district.administrativeUnits.sort((left, right) => left.name.localeCompare(right.name)),
          subcounties: district.administrativeUnits.flatMap((unit) => unit.subUnits.map((subUnit) => subUnit.name))
        }))
        .sort((left, right) => left.district.localeCompare(right.district))
    }))
  };
}

function buildCentralRegionCatalog() {
  return buildStructuredRegionCatalog("Central", CENTRAL_SUBREGION_DISTRICTS, CENTRAL_REGION_DATASET);
}

function buildNorthernRegionCatalog() {
  return buildStructuredRegionCatalog("Northern", NORTHERN_SUBREGION_DISTRICTS, NORTHERN_REGION_DATASET);
}

function buildFallbackRegion(region, subregions) {
  return {
    country: UGANDA_COUNTRY_NAME,
    region,
    subregions: subregions.map((entry) => ({
      subregion: entry.subregion,
      districts: entry.districts.map((district) => createFallbackDistrict(district))
    }))
  };
}

const UGANDA_GEO_HIERARCHY = [
  buildCentralRegionCatalog(),
  buildNorthernRegionCatalog(),
  buildStructuredRegionCatalog("Eastern", EASTERN_SUBREGION_DISTRICTS, EASTERN_REGION_DATASET),
  buildStructuredRegionCatalog("Western", WESTERN_SUBREGION_DISTRICTS, WESTERN_REGION_DATASET)
];

function getGeoCatalog() {
  return UGANDA_GEO_HIERARCHY;
}

function listCountries() {
  return ["Uganda"];
}

function listRegions() {
  return UGANDA_GEO_HIERARCHY.map((entry) => entry.region);
}

function findRegion(countryName, regionName) {
  const normalizedCountry = normalizeCountry(countryName);
  return UGANDA_GEO_HIERARCHY.find(
    (entry) => entry.country === normalizedCountry && normalizeLookup(entry.region) === normalizeLookup(regionName)
  ) || null;
}

function findSubregion(countryName, regionName, subregionName) {
  const region = findRegion(countryName, regionName);
  if (!region) {
    return null;
  }
  return region.subregions.find((entry) => normalizeLookup(entry.subregion) === normalizeLookup(subregionName)) || null;
}

function findDistrict(countryName, regionName, subregionName, districtName) {
  const subregion = findSubregion(countryName, regionName, subregionName);
  if (!subregion) {
    return null;
  }
  return subregion.districts.find((entry) => normalizeLookup(entry.district) === normalizeLookup(districtName)) || null;
}

function findDistrictInRegion(countryName, regionName, districtName) {
  const region = findRegion(countryName, regionName);
  if (!region) {
    return null;
  }
  for (const subregion of region.subregions) {
    const district = subregion.districts.find((entry) => normalizeLookup(entry.district) === normalizeLookup(districtName));
    if (district) {
      return { subregion, district };
    }
  }
  return null;
}

function findAdministrativeUnit(countryName, regionName, subregionName, districtName, administrativeUnitName) {
  const district = findDistrict(countryName, regionName, subregionName, districtName);
  if (!district) {
    return null;
  }
  return district.administrativeUnits.find((entry) => normalizeLookup(entry.name) === normalizeLookup(administrativeUnitName)) || null;
}

function findSubUnit(countryName, regionName, subregionName, districtName, administrativeUnitName, subUnitName) {
  const administrativeUnit = findAdministrativeUnit(countryName, regionName, subregionName, districtName, administrativeUnitName);
  if (!administrativeUnit) {
    return null;
  }
  return administrativeUnit.subUnits.find((entry) => normalizeLookup(entry.name) === normalizeLookup(subUnitName)) || null;
}

function buildStoredUserLocation(input = {}) {
  const normalized = {
    country: normalizeCountry(input.country || UGANDA_COUNTRY_NAME),
    region: normalizeName(input.region, "Unassigned"),
    subregion: normalizeName(input.subregion, ""),
    district: normalizeName(input.district, "Unassigned"),
    administrativeUnit: normalizeName(input.administrativeUnit || input.county, ""),
    subUnit: normalizeName(input.subUnit || input.subcounty, ""),
    county: normalizeName(input.county || input.subregion, "Unassigned"),
    subcounty: normalizeName(input.subcounty || input.subUnit, ""),
    village: String(input.village || "").trim()
  };

  if (!normalized.subregion && normalized.region && normalized.district) {
    const inferred = findDistrictInRegion(normalized.country, normalized.region, normalized.district);
    if (inferred) {
      normalized.subregion = inferred.subregion.subregion;
    }
  }

  if (!normalized.subregion) {
    normalized.subregion = "Unassigned";
  }

  if (!normalized.county || normalized.county === "Unassigned") {
    normalized.county = normalized.subregion;
  }

  if (!normalized.subcounty && normalized.subUnit) {
    normalized.subcounty = normalized.subUnit;
  }

  return normalized;
}

function validateHierarchy(rawLocation = {}) {
  const location = buildStoredUserLocation(rawLocation);

  if (location.country !== UGANDA_COUNTRY_NAME) {
    return { valid: false, message: "Country must be Uganda" };
  }

  const regionRecord = findRegion(location.country, location.region);
  if (!regionRecord) {
    return { valid: false, message: "Selected region does not belong to the chosen country" };
  }

  const districtMatch = findDistrictInRegion(location.country, location.region, location.district);
  if (!districtMatch) {
    return { valid: false, message: "Selected district or city does not belong to the chosen region" };
  }

  if (location.subregion && normalizeLookup(location.subregion) !== normalizeLookup(districtMatch.subregion.subregion)) {
    return { valid: false, message: "Selected subregion does not belong to the chosen region" };
  }

  const districtRecord = districtMatch.district;
  const administrativeUnits = districtRecord.administrativeUnits || [];
  const manualAdministrativeUnitRequired = administrativeUnits.length === 0;
  const administrativeUnitRecord = administrativeUnits.find(
    (entry) => normalizeLookup(entry.name) === normalizeLookup(location.administrativeUnit)
  ) || null;

  if (!manualAdministrativeUnitRequired && !administrativeUnitRecord) {
    return { valid: false, message: "Selected administrative unit does not belong to the chosen district" };
  }

  const subUnits = administrativeUnitRecord?.subUnits || [];
  const manualSubUnitRequired = !administrativeUnitRecord || subUnits.length === 0;
  const subUnitRecord = subUnits.find((entry) => normalizeLookup(entry.name) === normalizeLookup(location.subUnit)) || null;

  if (!manualSubUnitRequired && !subUnitRecord) {
    return { valid: false, message: "Selected sub unit does not belong to the chosen administrative unit" };
  }

  return {
    valid: true,
    districtType: districtRecord.type,
    manualAdministrativeUnitRequired,
    manualSubUnitRequired,
    resolvedSubregion: districtMatch.subregion.subregion
  };
}

function validateAgentGeography(geography = {}) {
  return validateHierarchy(geography);
}

function validateUserGeography(geography = {}) {
  return validateHierarchy(geography);
}

function buildUserGeoFromAgent(agent, userOverrides = {}) {
  return buildStoredUserLocation({
    country: userOverrides.country || agent.country || UGANDA_COUNTRY_NAME,
    region: userOverrides.region || agent.region,
    subregion: userOverrides.subregion || agent.subregion,
    district: userOverrides.district || agent.district,
    administrativeUnit: userOverrides.administrativeUnit || agent.administrativeUnit || agent.county,
    subUnit: userOverrides.subUnit || userOverrides.subcounty || agent.subUnit || agent.subcounty,
    village: userOverrides.village || ""
  });
}

function buildLoanGeoSnapshot({ agentLocation, userLocation, loanLocation, timestamp = new Date() }) {
  return {
    userLocation: buildStoredUserLocation(userLocation),
    agentLocation: buildStoredUserLocation(agentLocation),
    loanLocation: buildStoredUserLocation(loanLocation),
    timestamp
  };
}

function buildLoanRequestGeoSnapshot({ userLocation, assignedAgentId, capturedAt = new Date() }) {
  const location = buildStoredUserLocation(userLocation);
  return {
    country: location.country,
    region: location.region,
    subregion: location.subregion,
    district: location.district,
    administrativeUnit: location.administrativeUnit,
    subUnit: location.subUnit,
    agentId: assignedAgentId,
    capturedAt
  };
}

function flattenGeoSeedRows() {
  return UGANDA_GEO_HIERARCHY.flatMap((region) =>
    region.subregions.flatMap((subregion) =>
      subregion.districts.map((district) => ({
        country: region.country,
        region: region.region,
        subregion: subregion.subregion,
        district: district.district,
        districtType: district.type,
        administrativeUnits: district.administrativeUnits
      }))
    )
  );
}

module.exports = {
  UGANDA_COUNTRY_NAME,
  UGANDA_GEO_HIERARCHY,
  buildLoanGeoSnapshot,
  buildLoanRequestGeoSnapshot,
  buildStoredUserLocation,
  buildUserGeoFromAgent,
  findAdministrativeUnit,
  findDistrict,
  findRegion,
  findSubUnit,
  findSubregion,
  flattenGeoSeedRows,
  getGeoCatalog,
  listCountries,
  listRegions,
  validateAgentGeography,
  validateUserGeography
};
