import { Request, Response } from 'express';
import ExcelJS from 'exceljs';

import reportRepository from '../report.repository';

export default async function donationExcel(
  req: Request,
  res: Response,
) {

  const workbook =
    new ExcelJS.Workbook();

  const worksheet =
    workbook.addWorksheet(
      'Donations Report',
    );

  worksheet.columns = [

    {
      header: 'Serial No',
      key: 'sno',
      width: 12,
    },

    {
      header: 'Name',
      key: 'fullName',
      width: 30,
    },

    {
      header: 'Phone',
      key: 'phone',
      width: 16,
    },

    {
      header: 'Prefer date',
      key: 'preferDate',
      width: 16,
    },

    {
      header: 'Donation Type',
      key: 'donationType',
      width: 20,
    },

    {
      header: 'Amount',
      key: 'amount',
      width: 15,
    },

    {
      header: 'Payment Status',
      key: 'paymentStatus',
      width: 20,
    },

    {
      header: 'Transaction ID',
      key: 'transactionId',
      width: 35,
    },

    {
      header: 'Payment Method',
      key: 'paymentMethod',
      width: 20,
    },

    {
      header: 'Donated At',
      key: 'donatedAt',
      width: 25,
    },

  ];

  const [rows] =
    await reportRepository.donationReport(
      req.query as any,
    );
      rows.forEach(
    (row: any, index: number) => {

      worksheet.addRow({

        sno: index + 1,

        fullName: row.fullName,

        phone: row.phone,

        preferDate: row.preferDate,

        donationType: row.donationType,

        amount: row.amount,

        paymentStatus: row.paymentStatus,

        transactionId: row.transactionId,

        paymentMethod: row.paymentMethod,

        donatedAt: row.donatedAt,

      });

    },
  );

  worksheet.getRow(1).font = {

    bold: true,

  };

  worksheet.columns.forEach(

    column => {

      column.alignment = {

        vertical: 'middle',

        horizontal: 'center',

      };

    },

  );

  res.setHeader(

    'Content-Type',

    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  );

  res.setHeader(

    'Content-Disposition',

    'attachment; filename=donations-report.xlsx',

  );

  await workbook.xlsx.write(
    res,
  );

  res.end();

}