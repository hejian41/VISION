% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/AnalysisFunctions.R
\name{analyzeTrajectoryCorrelations}
\alias{analyzeTrajectoryCorrelations}
\title{Compute trajectory correlations for all signatures}
\usage{
analyzeTrajectoryCorrelations(object, signatureBackground = NULL)
}
\arguments{
\item{object}{the VISION object}

\item{signatureBackground}{as returned by `calculateSignatureBackground`}
}
\value{
the VISION object with values set for the analysis results
}
\description{
This is the main analysis function. For each filtered dataset, a set of
different projection onto low-dimensional space are computed, and the
consistency of the resulting space with the signature scores is computed
to find signals that are captured succesfully by the projections.
}
