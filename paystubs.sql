--
-- File generated with SQLiteStudio v3.4.0 on qua dez 25 21:09:06 2024
--
-- Text encoding used: UTF-8
--

-- Table: entries
CREATE TABLE IF NOT EXISTS entries (
    id           INTEGER PRIMARY KEY AUTO_INCREMENT,
    month        INTEGER,
    year         INTEGER,
    code         INTEGER,
    description  TEXT,
    ref          INTEGER,
    is_wage      INTEGER,
    is_deduction INTEGER,
    value        REAL,
    UNIQUE (
        month,
        year,
        code
    )
);

INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (244, 7, 2023, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 611.48);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (245, 7, 2023, 998, 'INSS', 11.16, 0, 1, 683.4);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (246, 7, 2023, 8781, 'DIAS NORMAIS', 21, 1, 0, 6125.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (247, 8, 2023, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1280.13);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (248, 8, 2023, 998, 'INSS', 10.02, 0, 1, 876.95);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (249, 8, 2023, 8781, 'DIAS NORMAIS', 30, 1, 0, 8750.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (250, 9, 2023, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1280.13);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (251, 9, 2023, 998, 'INSS', 10.02, 0, 1, 876.95);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (252, 9, 2023, 8781, 'DIAS NORMAIS', 30, 1, 0, 8750.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (253, 10, 2023, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1302.9);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (254, 10, 2023, 998, 'INSS', 9.93, 0, 1, 876.95);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (255, 10, 2023, 206, 'DESC ADTO RECOGNITION', 0, 0, 1, 60.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (256, 10, 2023, 201, 'RECOGNITION', 60, 1, 0, 82.8);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (257, 10, 2023, 8781, 'DIAS NORMAIS', 30, 1, 0, 8750.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (258, 11, 2023, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1695.88);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (259, 11, 2023, 998, 'INSS', 8.55, 0, 1, 876.95);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (260, 11, 2023, 225, 'TAXA NEGOCIAL', 2, 0, 1, 176.19);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (261, 11, 2023, 222, 'BONUS HOME OFFICE', 1333.34, 1, 0, 1333.34);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (262, 11, 2023, 19, 'DIFERENCA DE SALARIOS', 119, 1, 0, 119.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (263, 11, 2023, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (264, 12, 2023, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1296.49);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (265, 12, 2023, 998, 'INSS', 9.95, 0, 1, 876.95);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (266, 12, 2023, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (267, 1, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1287.72);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (268, 1, 2024, 998, 'INSS', 10.32, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (269, 1, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (270, 2, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 2700.79);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (271, 2, 2024, 998, 'INSS', 6.5, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (272, 2, 2024, 243, 'ESPP ACOES', 5, 0, 1, 699.4);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (273, 2, 2024, 202, 'BONUS KC', 5178.59, 1, 0, 5178.59);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (274, 2, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (275, 3, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1276.68);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (276, 3, 2024, 998, 'INSS', 10.32, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (277, 3, 2024, 243, 'ESPP ACOES', 5, 0, 1, 440.48);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (278, 3, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (279, 4, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1299.45);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (280, 4, 2024, 998, 'INSS', 10.22, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (281, 4, 2024, 243, 'ESPP ACOES', 5, 0, 1, 440.48);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (282, 4, 2024, 206, 'DESC ADTO RECOGNITION', 0, 0, 1, 60.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (283, 4, 2024, 201, 'RECOGNITION', 60, 1, 0, 82.8);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (284, 4, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (285, 5, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (286, 5, 2024, 205, 'BONUS', 1946.9, 1, 0, 1946.9);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (287, 5, 2024, 243, 'ESPP ACOES', 5, 0, 1, 537.82);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (288, 5, 2024, 998, 'INSS', 8.45, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (289, 5, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1812.08);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (290, 6, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1276.68);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (291, 6, 2024, 998, 'INSS', 10.32, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (292, 6, 2024, 243, 'ESPP ACOES', 5, 0, 1, 440.48);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (293, 6, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (294, 7, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1276.68);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (295, 7, 2024, 998, 'INSS', 10.32, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (296, 7, 2024, 243, 'ESPP ACOES', 5, 0, 1, 440.48);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (297, 7, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 8809.5);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (298, 8, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 2108.68);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (299, 8, 2024, 998, 'INSS', 7.68, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (300, 8, 2024, 243, 'ESPP ACOES', 10, 0, 1, 1158.66);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (301, 8, 2024, 206, 'DESC ADTO RECOGNITION', 0, 0, 1, 180.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (302, 8, 2024, 252, 'BONUS AE', 1946.9, 1, 0, 1946.9);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (303, 8, 2024, 202, 'BONUS KC', 609.93, 1, 0, 609.93);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (304, 8, 2024, 201, 'RECOGNITION', 180, 1, 0, 248.4);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (305, 8, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 9029.73);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (306, 9, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1462.26);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (307, 9, 2024, 998, 'INSS', 9.58, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (308, 9, 2024, 249, 'DESC ADTO DE OPÇÕES ESPP', 454.61, 0, 1, 454.61);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (309, 9, 2024, 243, 'ESPP ACOES', 10, 0, 1, 902.97);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (310, 9, 2024, 248, 'EXERCICIO DE OPÇOES ESPP', 454.61, 1, 0, 454.61);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (311, 9, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 9029.73);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (312, 10, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 1545.83);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (313, 10, 2024, 998, 'INSS', 9.29, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (314, 10, 2024, 243, 'ESPP ACOES', 10, 0, 1, 978.82);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (315, 10, 2024, 19, 'DIFERENCA DE SALARIOS', 379.25, 1, 0, 379.25);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (316, 10, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 9408.98);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (317, 11, 2024, 8781, 'DIAS NORMAIS', 30, 1, 0, 9408.98);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (318, 11, 2024, 201, 'RECOGNITION', 60, 1, 0, 82.8);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (319, 11, 2024, 252, 'BONUS AE', 1995.57, 1, 0, 1995.57);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (320, 11, 2024, 206, 'DESC ADTO RECOGNITION', 0, 0, 1, 60.0);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (321, 11, 2024, 225, 'TAXA NEGOCIAL', 2, 0, 1, 188.18);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (322, 11, 2024, 243, 'ESPP ACOES', 10, 0, 1, 1140.46);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (323, 11, 2024, 998, 'INSS', 7.91, 0, 1, 908.85);
INSERT INTO entries (id, month, year, code, description, ref, is_wage, is_deduction, value) VALUES (324, 11, 2024, 999, 'IMPOSTO DE RENDA', 27.5, 0, 1, 2013.09);
